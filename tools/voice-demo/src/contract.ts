/**
 * Types for the future `public-voice-demo` backend endpoint.
 *
 * ---------------------------------------------------------------------------
 * THE CONTRACT IS NOT AGREED YET.
 * ---------------------------------------------------------------------------
 * Nothing in this file should be read as a decision. It states what the widget
 * *needs* in order to work, names the shape we would prefer, and — because the
 * final field names are the backend's call, not ours — resolves a small set of
 * documented aliases at runtime instead of hard-coding one spelling.
 *
 * `normalizeSession()` is the single place where wire format meets the widget.
 * When the endpoint ships, either the backend matches `PREFERRED_*` and the
 * aliases become dead weight worth deleting, or it does not and only this file
 * changes.
 *
 * See tools/voice-demo/BACKEND-CONTRACT.md for the prose version, which is the
 * document to hand to whoever writes the endpoint.
 */

/** Locales the widget can render. The backend echoes back what it resolved. */
export type DemoLocale = 'en' | 'he' | 'ar';

/**
 * Error codes the widget knows how to render distinctly. Anything else is
 * funnelled to `server_error`, so an unrecognised code degrades to a generic
 * message rather than a blank panel.
 *
 * UNCONFIRMED: whether the backend returns these as a string `error` field, a
 * `code` field, or an RFC 7807 `type` URI. `readErrorCode()` accepts all three.
 */
export type DemoErrorCode =
  | 'demo_disabled'
  | 'demo_unavailable'
  | 'demo_capacity_reached'
  | 'rate_limited'
  | 'verification_failed'
  | 'consent_required'
  | 'invalid_request'
  | 'server_error';

const KNOWN_ERROR_CODES: readonly string[] = [
  'demo_disabled',
  'demo_unavailable',
  'demo_capacity_reached',
  'rate_limited',
  'verification_failed',
  'consent_required',
  'invalid_request',
  'server_error',
];

/**
 * Recording consent, as returned by the server.
 *
 * The widget renders `text` verbatim and never substitutes wording of its own —
 * consent copy is a legal artefact and belongs with whoever versions it. If
 * recording is enabled and this block is absent, the widget refuses to connect
 * rather than recording someone under wording it invented.
 */
export interface RecordingConsent {
  /** True when the visitor must actively accept before the session may start. */
  required: boolean;
  /** Server-authored consent copy, already localised. Rendered as plain text. */
  text: string;
  /** Opaque version string, echoed back on acceptance. */
  policyVersion: string;
  /** Locale the server actually rendered `text` in — may differ from requested. */
  locale: string;
  /** Optional link to the full policy. */
  policyUrl?: string;
}

/** What the widget must have in hand before it can join a room. */
export interface DemoSession {
  /** Short-lived LiveKit *participant* token. Never a LiveKit API secret. */
  token: string;
  /** LiveKit websocket URL, e.g. wss://<project>.livekit.cloud */
  livekitUrl: string;
  /** Room or session identifier, for support and correlation. */
  sessionId: string;
  /** Absolute expiry as an ISO-8601 timestamp. */
  expiresAt: string;
  /** Locale the backend resolved for the agent. */
  language: string;
  /** Present only when the session is recorded. */
  recording?: RecordingConsent;
}

/** Request body. Only these fields are ever sent. */
export interface DemoSessionRequest {
  /** The website's current locale. */
  language: DemoLocale;
  /** Echoed consent acceptance, when a previous response demanded it. */
  consent?: {
    policyVersion: string;
    locale: string;
    acceptedAt: string;
  };
  /** Bot-check token, sent only when a site key is configured. */
  turnstileToken?: string;
}

/**
 * Field names we would prefer the backend to use. Listed first in each alias
 * group below, and the names documented in BACKEND-CONTRACT.md.
 */
export const PREFERRED_RESPONSE_FIELDS = {
  token: 'token',
  livekitUrl: 'livekit_url',
  sessionId: 'session_id',
  expiresAt: 'expires_at',
  language: 'language',
  recording: 'recording',
} as const;

/**
 * Accepted spellings per field, preferred first.
 *
 * These exist because the endpoint is unwritten, not because we want a
 * permanently loose contract. Once the real shape lands, cut each list to one.
 */
const ALIASES: Record<keyof typeof PREFERRED_RESPONSE_FIELDS, readonly string[]> = {
  token: ['token', 'participant_token', 'access_token', 'accessToken', 'participantToken'],
  livekitUrl: ['livekit_url', 'livekitUrl', 'url', 'ws_url', 'wsUrl', 'server_url'],
  sessionId: ['session_id', 'sessionId', 'room_name', 'roomName', 'room', 'preview_session_id'],
  expiresAt: ['expires_at', 'expiresAt', 'expiry', 'expires'],
  language: ['language', 'resolved_language', 'resolvedLanguage', 'locale'],
  recording: ['recording', 'recording_consent', 'recordingConsent', 'consent'],
};

const RECORDING_ALIASES = {
  required: ['required', 'consent_required', 'consentRequired', 'is_required'],
  text: ['text', 'consent_text', 'consentText', 'notice', 'message'],
  policyVersion: ['policy_version', 'policyVersion', 'version'],
  locale: ['locale', 'language', 'lang'],
  policyUrl: ['policy_url', 'policyUrl', 'url', 'href'],
} as const;

/** Raised when the response cannot satisfy the widget's minimum needs. */
export class ContractViolation extends Error {
  readonly missing: readonly string[];

  constructor(missing: readonly string[]) {
    super(
      `public-voice-demo response is missing required field(s): ${missing.join(', ')}. ` +
        `See tools/voice-demo/BACKEND-CONTRACT.md.`,
    );
    this.name = 'ContractViolation';
    this.missing = missing;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function pickString(source: Record<string, unknown>, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return undefined;
}

function pickBoolean(source: Record<string, unknown>, keys: readonly string[]): boolean | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'boolean') return value;
  }
  return undefined;
}

function pickRecord(
  source: Record<string, unknown>,
  keys: readonly string[],
): Record<string, unknown> | undefined {
  for (const key of keys) {
    const value = source[key];
    if (isRecord(value)) return value;
  }
  return undefined;
}

/**
 * Reads an error code out of whatever shape the endpoint uses, and collapses
 * anything unrecognised to `server_error`.
 */
export function readErrorCode(body: unknown, httpStatus: number): DemoErrorCode {
  const raw = isRecord(body)
    ? pickString(body, ['error', 'code', 'error_code', 'errorCode', 'type'])
    : undefined;

  if (raw) {
    const normalized = raw.split('/').pop() ?? raw;
    if (KNOWN_ERROR_CODES.includes(normalized)) return normalized as DemoErrorCode;
  }

  // Fall back to the status class, which is the only other thing we can trust.
  if (httpStatus === 429) return 'rate_limited';
  if (httpStatus === 503) return 'demo_unavailable';
  if (httpStatus === 403) return 'verification_failed';
  if (httpStatus >= 400 && httpStatus < 500) return 'invalid_request';
  return 'server_error';
}

/** Parses the recording block, if the response carries one. */
export function normalizeRecording(raw: unknown): RecordingConsent | undefined {
  if (!isRecord(raw)) return undefined;

  const text = pickString(raw, RECORDING_ALIASES.text);
  const policyVersion = pickString(raw, RECORDING_ALIASES.policyVersion);
  const locale = pickString(raw, RECORDING_ALIASES.locale);
  const required = pickBoolean(raw, RECORDING_ALIASES.required) ?? false;
  const policyUrl = pickString(raw, RECORDING_ALIASES.policyUrl);

  // A consent block without copy or a version is unusable: we will not invent
  // wording, and we cannot record an acceptance we cannot identify.
  if (!text || !policyVersion) return undefined;

  const consent: RecordingConsent = {
    required,
    text,
    policyVersion,
    locale: locale ?? '',
  };
  if (policyUrl !== undefined) consent.policyUrl = policyUrl;
  return consent;
}

/**
 * Turns an untyped response body into a `DemoSession`, or throws
 * `ContractViolation` naming exactly what was missing.
 */
export function normalizeSession(raw: unknown): DemoSession {
  if (!isRecord(raw)) throw new ContractViolation(['<response body was not an object>']);

  const token = pickString(raw, ALIASES.token);
  const livekitUrl = pickString(raw, ALIASES.livekitUrl);
  const sessionId = pickString(raw, ALIASES.sessionId);
  const expiresAt = pickString(raw, ALIASES.expiresAt);
  const language = pickString(raw, ALIASES.language);

  const missing: string[] = [];
  if (!token) missing.push(PREFERRED_RESPONSE_FIELDS.token);
  if (!livekitUrl) missing.push(PREFERRED_RESPONSE_FIELDS.livekitUrl);
  if (!sessionId) missing.push(PREFERRED_RESPONSE_FIELDS.sessionId);
  if (!expiresAt) missing.push(PREFERRED_RESPONSE_FIELDS.expiresAt);
  if (!language) missing.push(PREFERRED_RESPONSE_FIELDS.language);
  if (missing.length > 0) throw new ContractViolation(missing);

  const session: DemoSession = {
    // Non-null: `missing` is empty, so each was found.
    token: token as string,
    livekitUrl: livekitUrl as string,
    sessionId: sessionId as string,
    expiresAt: expiresAt as string,
    language: language as string,
  };

  const recording = normalizeRecording(pickRecord(raw, ALIASES.recording));
  if (recording !== undefined) session.recording = recording;
  return session;
}

/**
 * Guards against a credential that should never reach a browser.
 *
 * A Supabase service-role key and a LiveKit API secret are both catastrophic if
 * shipped to visitors, and both are easy to paste into the wrong config field.
 * The anon key is a JWT with `"role":"anon"`; the service-role key is the same
 * shape with `"role":"service_role"`, so they are trivially confusable by eye.
 */
export function looksLikeServerSecret(value: string): boolean {
  if (!value) return false;

  const parts = value.split('.');
  if (parts.length === 3 && parts[1]) {
    try {
      const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const decoded = atob(payload);
      if (/"role"\s*:\s*"service_role"/.test(decoded)) return true;
    } catch {
      // Not decodable base64 — fall through to the textual checks.
    }
  }

  return /service_role|SUPABASE_SERVICE|LIVEKIT_API_SECRET|sk_live|secret_key/i.test(value);
}
