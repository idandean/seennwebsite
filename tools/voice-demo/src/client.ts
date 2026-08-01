/**
 * Typed client for the `public-voice-demo` endpoint.
 *
 * Deliberately NOT the authenticated `ar-preview-call` endpoint: this one is
 * called by anonymous visitors, carries the Supabase anon/publishable key and
 * no Authorization header, and must never be able to dial a phone number.
 *
 * The request body is built from a literal with exactly two fields (frozen
 * decision 3). There is no spread of caller-supplied data anywhere in this
 * file, so `destination_phone` or `tenant_id` cannot reach the wire even if a
 * caller passes them.
 */

import { ContractViolation, normalizeSession, parseRecording, readErrorCode } from './contract';
import type { DemoErrorCode, DemoLocale, DemoSession, RecordingConsent } from './contract';

/** A demand for consent rather than a session. Retained for a possible v2. */
export interface ConsentRequired {
  kind: 'consent_required';
  consent: RecordingConsent;
}

export interface SessionGranted {
  kind: 'session';
  session: DemoSession;
}

export type SessionResult = SessionGranted | ConsentRequired;

export type ClientErrorCode = DemoErrorCode | 'network_error' | 'contract_violation';

export class DemoRequestError extends Error {
  readonly code: ClientErrorCode;
  readonly httpStatus: number | null;
  /** Seconds, from a `Retry-After` header. Honoured by the widget. */
  readonly retryAfterSeconds: number | null;

  constructor(
    code: ClientErrorCode,
    message: string,
    httpStatus: number | null = null,
    retryAfterSeconds: number | null = null,
  ) {
    super(message);
    this.name = 'DemoRequestError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export interface ClientOptions {
  baseUrl: string;
  anonKey: string;
  path: string;
  /**
   * When true, a request without a Turnstile token is refused before it is
   * sent. Set whenever a site key is configured — see frozen decision 3 and
   * `Never silently send a request without the configured Turnstile token`.
   */
  requireTurnstileToken: boolean;
  fetchImpl?: typeof fetch;
  /** Injected in tests so expiry validation is deterministic. */
  now?: () => number;
}

export interface CreateSessionInput {
  locale: DemoLocale;
  /** A fresh, single-use Turnstile token. */
  turnstileToken?: string | undefined;
  /** Retained for a possible v2; matched on version *and* locale. */
  consent?: { policyVersion: string; locale: string; acceptedAt: string } | undefined;
  signal?: AbortSignal | undefined;
}

function parseRetryAfter(headers: Headers | undefined): number | null {
  const raw = headers?.get?.('retry-after');
  if (!raw) return null;

  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds;

  // Retry-After may also be an HTTP-date.
  const asDate = Date.parse(raw);
  if (!Number.isNaN(asDate)) return Math.max(0, Math.round((asDate - Date.now()) / 1000));
  return null;
}

export function rateLimitScopeFor(code: ClientErrorCode): 'per_visitor' | 'global_capacity' {
  return code === 'demo_capacity_reached' ? 'global_capacity' : 'per_visitor';
}

export class PublicVoiceDemoClient {
  private readonly options: ClientOptions;
  private readonly doFetch: typeof fetch;
  private readonly now: () => number;

  constructor(options: ClientOptions) {
    this.options = options;
    this.doFetch = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.now = options.now ?? (() => Date.now());
  }

  get endpoint(): string {
    return `${this.options.baseUrl.replace(/\/+$/, '')}${this.options.path}`;
  }

  async createSession(input: CreateSessionInput): Promise<SessionResult> {
    const turnstileToken = input.turnstileToken?.trim() ?? '';

    // Fail closed *before* the request. A demo protected by Turnstile that
    // quietly posts without a token is not protected by Turnstile.
    if (this.options.requireTurnstileToken && !turnstileToken) {
      throw new DemoRequestError(
        'verification_failed',
        'refusing to send a session request without a Turnstile token',
      );
    }

    // Frozen decision 3: exactly these fields, built as a literal.
    const body: Record<string, unknown> = { language: input.locale };
    if (turnstileToken) body['turnstile_token'] = turnstileToken;
    if (input.consent) {
      body['consent'] = {
        policy_version: input.consent.policyVersion,
        locale: input.consent.locale,
        accepted_at: input.consent.acceptedAt,
      };
    }

    let response: Response;
    try {
      response = await this.doFetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Anonymous visitors: anon/publishable key only, no user token.
          apikey: this.options.anonKey,
        },
        body: JSON.stringify(body),
        ...(input.signal ? { signal: input.signal } : {}),
      });
    } catch (cause) {
      if ((cause as Error)?.name === 'AbortError') throw cause;
      throw new DemoRequestError('network_error', 'could not reach the demo endpoint');
    }

    const payload: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const code = readErrorCode(payload, response.status);

      if (code === 'consent_required') {
        const parsed = parseRecording(this.readConsentBlock(payload));
        if (parsed.status === 'ok') return { kind: 'consent_required', consent: parsed.consent };
        // Demanded consent we cannot render: fail closed rather than guess.
        throw new DemoRequestError(
          'contract_violation',
          parsed.status === 'malformed'
            ? `consent demanded but ${parsed.reason}`
            : 'consent demanded but no usable recording block was returned',
          response.status,
        );
      }

      throw new DemoRequestError(
        code,
        `demo endpoint returned ${response.status}`,
        response.status,
        parseRetryAfter(response.headers),
      );
    }

    // A 2xx may still be a consent demand, depending on how the backend models
    // it. Only treated as one when there is no usable token alongside it —
    // `normalizeSession` rejects the both-at-once case outright.
    if (!this.payloadHasToken(payload)) {
      const parsed = parseRecording(this.readConsentBlock(payload));
      if (parsed.status === 'ok' && parsed.consent.required) {
        return { kind: 'consent_required', consent: parsed.consent };
      }
      if (parsed.status === 'malformed' && parsed.required) {
        throw new DemoRequestError('contract_violation', parsed.reason, response.status);
      }
    }

    try {
      return { kind: 'session', session: normalizeSession(payload, { now: this.now() }) };
    } catch (cause) {
      if (cause instanceof ContractViolation) {
        throw new DemoRequestError('contract_violation', cause.message, response.status);
      }
      throw cause;
    }
  }

  private readConsentBlock(payload: unknown): unknown {
    if (!payload || typeof payload !== 'object') return undefined;
    const record = payload as Record<string, unknown>;
    return record['recording'] ?? record['consent'] ?? record['recording_consent'] ?? record;
  }

  private payloadHasToken(payload: unknown): boolean {
    if (!payload || typeof payload !== 'object') return false;
    const record = payload as Record<string, unknown>;
    return ['token', 'participant_token', 'access_token', 'accessToken', 'participantToken'].some(
      (key) => typeof record[key] === 'string' && (record[key] as string).trim().length > 0,
    );
  }
}
