/**
 * Typed client for the future `public-voice-demo` endpoint.
 *
 * Deliberately NOT the authenticated `ar-preview-call` endpoint: this one is
 * called by anonymous visitors, so it carries the Supabase anon key and no user
 * token, and it must never be able to dial a phone number. The request body is
 * built from a literal — there is no spread of caller-supplied fields — so a
 * `destination_phone` or `tenant_id` cannot reach it by accident.
 */

import {
  ContractViolation,
  normalizeRecording,
  normalizeSession,
  readErrorCode,
} from './contract';
import type {
  DemoErrorCode,
  DemoLocale,
  DemoSession,
  DemoSessionRequest,
  RecordingConsent,
} from './contract';

/** A demand for consent, rather than a session. */
export interface ConsentRequired {
  kind: 'consent_required';
  consent: RecordingConsent;
}

export interface SessionGranted {
  kind: 'session';
  session: DemoSession;
}

export type SessionResult = SessionGranted | ConsentRequired;

export class DemoRequestError extends Error {
  readonly code: DemoErrorCode | 'network_error' | 'contract_violation';
  readonly httpStatus: number | null;
  /** Present for 429s that carry one. */
  readonly retryAfterSeconds: number | null;

  constructor(
    code: DemoRequestError['code'],
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
  /** Injected in tests. */
  fetchImpl?: typeof fetch;
}

export interface CreateSessionInput {
  locale: DemoLocale;
  consent?: { policyVersion: string; locale: string; acceptedAt: string } | undefined;
  turnstileToken?: string | undefined;
  signal?: AbortSignal | undefined;
}

function parseRetryAfter(headers: Headers | undefined): number | null {
  const raw = headers?.get?.('retry-after');
  if (!raw) return null;
  const seconds = Number(raw);
  return Number.isFinite(seconds) ? seconds : null;
}

/**
 * Distinguishes the two 429s the widget renders differently: a per-visitor
 * limit ("you've had a few goes") and a global capacity ceiling ("everyone
 * wants a word"). UNCONFIRMED which the backend will emit — both are handled.
 */
export function rateLimitScopeFor(code: DemoErrorCode): 'per_visitor' | 'global_capacity' {
  return code === 'demo_capacity_reached' ? 'global_capacity' : 'per_visitor';
}

export class PublicVoiceDemoClient {
  private readonly options: ClientOptions;
  private readonly doFetch: typeof fetch;

  constructor(options: ClientOptions) {
    this.options = options;
    this.doFetch = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  get endpoint(): string {
    return `${this.options.baseUrl.replace(/\/+$/, '')}${this.options.path}`;
  }

  async createSession(input: CreateSessionInput): Promise<SessionResult> {
    // Built as a literal on purpose — see the note at the top of this file.
    const body: DemoSessionRequest = { language: input.locale };
    if (input.consent) body.consent = input.consent;
    if (input.turnstileToken) body.turnstileToken = input.turnstileToken;

    let response: Response;
    try {
      response = await this.doFetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Anonymous visitors: the anon key only, never a user token and
          // never a service-role key (rejected in config.ts).
          apikey: this.options.anonKey,
        },
        body: JSON.stringify(this.serializeRequest(body)),
        ...(input.signal ? { signal: input.signal } : {}),
      });
    } catch (cause) {
      if ((cause as Error)?.name === 'AbortError') throw cause;
      throw new DemoRequestError('network_error', 'could not reach the demo endpoint');
    }

    const payload: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const code = readErrorCode(payload, response.status);

      // A 4xx demanding consent is a normal step, not a failure.
      if (code === 'consent_required') {
        const consent = normalizeRecording(this.readConsentBlock(payload));
        if (consent) return { kind: 'consent_required', consent };
      }

      throw new DemoRequestError(
        code,
        `demo endpoint returned ${response.status}`,
        response.status,
        parseRetryAfter(response.headers),
      );
    }

    // A 2xx may still be a consent demand, depending on how the backend models
    // it. Both shapes are accepted; the backend picks one (see the contract doc).
    const consentBlock = this.readConsentBlock(payload);
    const consent = normalizeRecording(consentBlock);
    if (consent?.required && !this.payloadHasToken(payload)) {
      return { kind: 'consent_required', consent };
    }

    try {
      return { kind: 'session', session: normalizeSession(payload) };
    } catch (cause) {
      if (cause instanceof ContractViolation) {
        throw new DemoRequestError('contract_violation', cause.message, response.status);
      }
      throw cause;
    }
  }

  /** `consent` may sit at the top level or inside `recording`. */
  private readConsentBlock(payload: unknown): unknown {
    if (!payload || typeof payload !== 'object') return undefined;
    const record = payload as Record<string, unknown>;
    return record['recording'] ?? record['consent'] ?? record['recording_consent'] ?? record;
  }

  private payloadHasToken(payload: unknown): boolean {
    if (!payload || typeof payload !== 'object') return false;
    const record = payload as Record<string, unknown>;
    return ['token', 'participant_token', 'access_token', 'accessToken', 'participantToken'].some(
      (key) => typeof record[key] === 'string' && (record[key] as string).length > 0,
    );
  }

  /**
   * Wire encoding. Camel-case request fields are sent snake_case, matching the
   * rest of the Supabase functions in this stack. UNCONFIRMED — flagged in the
   * contract doc as a thing the backend must confirm.
   */
  private serializeRequest(body: DemoSessionRequest): Record<string, unknown> {
    const out: Record<string, unknown> = { language: body.language };
    if (body.consent) {
      out['consent'] = {
        policy_version: body.consent.policyVersion,
        locale: body.consent.locale,
        accepted_at: body.consent.acceptedAt,
      };
    }
    if (body.turnstileToken) out['turnstile_token'] = body.turnstileToken;
    return out;
  }
}
