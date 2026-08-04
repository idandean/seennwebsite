/**
 * Types and validation for the `public-voice-demo` backend endpoint.
 *
 * ---------------------------------------------------------------------------
 * FROZEN PRODUCT DECISIONS (v1)
 * ---------------------------------------------------------------------------
 *   1. The website demo is NOT recorded. No consent is required.
 *   2. The frontend sends no `amount` or `balance_month`; the backend supplies
 *      its own demo defaults.
 *   3. Request body is exactly `{ language, turnstile_token }`.
 *   4. `apikey` header with a Supabase anon/publishable key, no Authorization.
 *   5. A successful response must carry token, livekit_url, session_id,
 *      expires_at and language.
 *   6. `destination_phone` and `tenant_id` are never sent.
 *
 * The consent machinery below is retained for a possible v2 only, and is
 * deliberately fail-closed: because v1 is not recorded, any response that
 * demands recording is treated as a contract violation rather than something
 * to accommodate. See `normalizeSession`.
 *
 * `normalizeSession()` is the single place where wire format meets the widget.
 * Field-name aliases remain supported for compatibility with deployed and
 * earlier response spellings, but
 * the *values* are now strictly validated — a token we cannot use is worse than
 * no token, because it produces a connected UI attached to nothing.
 */

/** Locales the widget can render. */
export type DemoLocale = 'en' | 'he' | 'ar';

export type DemoErrorCode =
  | 'demo_disabled'
  | 'demo_unavailable'
  | 'demo_capacity_reached'
  | 'rate_limited'
  | 'verification_failed'
  | 'invalid_language'
  | 'consent_required'
  | 'consent_policy_outdated'
  | 'invalid_request'
  | 'server_error';

const KNOWN_ERROR_CODES: readonly string[] = [
  'demo_disabled',
  'demo_unavailable',
  'demo_capacity_reached',
  'rate_limited',
  'verification_failed',
  'invalid_language',
  'consent_required',
  'consent_policy_outdated',
  'invalid_request',
  'server_error',
];

/** Recording consent, as returned by the server. Unused in v1. */
export interface RecordingConsent {
  required: boolean;
  /** Server-authored, already localised. Rendered verbatim, never invented. */
  text: string;
  /** Opaque version string, echoed back on acceptance. */
  policyVersion: string;
  /** Locale the server rendered `text` in. Echoed back, and matched on. */
  locale: string;
  /** Optional. http/https only. */
  policyUrl?: string;
}

export interface DemoSession {
  /** Short-lived LiveKit *participant* token. Never an API secret. */
  token: string;
  /** Must be a `wss://` URL. */
  livekitUrl: string;
  sessionId: string;
  /** ISO-8601, must be in the future. */
  expiresAt: string;
  /** Canonicalised to en | he | ar. */
  language: DemoLocale;
  recording?: RecordingConsent;
}

/** Exactly what goes on the wire. See frozen decision 3. */
export interface DemoSessionRequest {
  language: DemoLocale;
  turnstileToken: string;
}

export const PREFERRED_RESPONSE_FIELDS = {
  token: 'token',
  livekitUrl: 'livekit_url',
  sessionId: 'session_id',
  expiresAt: 'expires_at',
  language: 'language',
  recording: 'recording',
} as const;

/**
 * Accepted spellings per field, preferred first. Retained for compatibility;
 * narrow these only as a separate, coordinated contract change.
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

/** Raised when a response cannot be used. Carries every problem found. */
export class ContractViolation extends Error {
  readonly problems: readonly string[];

  constructor(problems: readonly string[]) {
    super(
      `public-voice-demo response is unusable: ${problems.join('; ')}. ` +
        `See tools/voice-demo/BACKEND-CONTRACT.md.`,
    );
    this.name = 'ContractViolation';
    this.problems = problems;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function pickString(source: Record<string, unknown>, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim().length > 0) return value;
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
 * Maps a BCP-47-ish tag onto one of the three locales the widget speaks.
 * Returns null for anything else — a session in a language we cannot render is
 * a session we should not join.
 */
export function canonicalizeLanguage(raw: string | undefined): DemoLocale | null {
  if (!raw) return null;
  const tag = raw.trim().toLowerCase().replace(/_/g, '-');
  const primary = tag.split('-')[0] ?? '';
  if (primary === 'en') return 'en';
  if (primary === 'he' || primary === 'iw') return 'he'; // `iw` is the legacy code
  if (primary === 'ar') return 'ar';
  return null;
}

/** `wss://` only. `ws://` would put a participant token on the wire in clear. */
export function isSecureWebSocketUrl(raw: string): boolean {
  try {
    return new URL(raw).protocol === 'wss:';
  } catch {
    return false;
  }
}

function isHttpUrl(raw: string): boolean {
  try {
    const protocol = new URL(raw).protocol;
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

export type RecordingParse =
  | { status: 'absent' }
  | { status: 'ok'; consent: RecordingConsent }
  /** Present, claims to be required, but unusable. Must fail closed. */
  | { status: 'malformed'; required: boolean; reason: string };

/**
 * Parses a recording block.
 *
 * A block that demands consent but carries no wording or no version is
 * `malformed`: we will not invent consent copy, and we cannot record an
 * acceptance we cannot identify. An invalid `policy_url` counts as malformed
 * too — a consent notice pointing somewhere unexpected is worse than none.
 */
export function parseRecording(raw: unknown): RecordingParse {
  if (!isRecord(raw)) return { status: 'absent' };

  const required = pickBoolean(raw, RECORDING_ALIASES.required) ?? false;
  const text = pickString(raw, RECORDING_ALIASES.text);
  const policyVersion = pickString(raw, RECORDING_ALIASES.policyVersion);
  const locale = pickString(raw, RECORDING_ALIASES.locale);
  const policyUrl = pickString(raw, RECORDING_ALIASES.policyUrl);

  if (!text && !policyVersion && !required) return { status: 'absent' };

  if (!text) {
    return { status: 'malformed', required, reason: 'recording block has no consent text' };
  }
  if (!policyVersion) {
    return { status: 'malformed', required, reason: 'recording block has no policy version' };
  }
  if (policyUrl !== undefined && !isHttpUrl(policyUrl)) {
    return { status: 'malformed', required, reason: 'recording policy_url is not http(s)' };
  }

  const consent: RecordingConsent = {
    required,
    text,
    policyVersion,
    locale: locale ?? '',
  };
  if (policyUrl !== undefined) consent.policyUrl = policyUrl;
  return { status: 'ok', consent };
}

/** Back-compat helper: the consent object, or undefined if unusable. */
export function normalizeRecording(raw: unknown): RecordingConsent | undefined {
  const parsed = parseRecording(raw);
  return parsed.status === 'ok' ? parsed.consent : undefined;
}

export function readErrorCode(body: unknown, httpStatus: number): DemoErrorCode {
  const raw = isRecord(body)
    ? pickString(body, ['error', 'code', 'error_code', 'errorCode', 'type'])
    : undefined;

  if (raw) {
    const normalized = raw.split('/').pop() ?? raw;
    if (KNOWN_ERROR_CODES.includes(normalized)) return normalized as DemoErrorCode;
  }

  if (httpStatus === 429) return 'rate_limited';
  if (httpStatus === 503) return 'demo_unavailable';
  if (httpStatus === 403) return 'verification_failed';
  if (httpStatus >= 400 && httpStatus < 500) return 'invalid_request';
  return 'server_error';
}

export interface NormalizeOptions {
  /** Injected in tests so expiry checks are deterministic. */
  now?: number;
  /** The canonical language sent in the request, when one was required. */
  expectedLanguage?: DemoLocale;
}

/**
 * Turns an untyped response body into a usable `DemoSession`, or throws
 * `ContractViolation` listing everything wrong with it.
 *
 * Every check here exists because the failure it prevents is silent: a
 * `ws://` URL leaks the token, a past expiry produces a session that dies on
 * arrival, an unrenderable language produces a call the visitor cannot follow,
 * and a token alongside `recording.required` produces a recorded call the
 * visitor never agreed to.
 */
export function normalizeSession(raw: unknown, options: NormalizeOptions = {}): DemoSession {
  if (!isRecord(raw)) throw new ContractViolation(['response body was not an object']);

  const now = options.now ?? Date.now();
  const problems: string[] = [];

  const token = pickString(raw, ALIASES.token);
  const livekitUrl = pickString(raw, ALIASES.livekitUrl);
  const sessionId = pickString(raw, ALIASES.sessionId);
  const expiresAt = pickString(raw, ALIASES.expiresAt);
  const language = pickString(raw, ALIASES.language);

  if (!token) problems.push(`missing ${PREFERRED_RESPONSE_FIELDS.token}`);

  if (!livekitUrl) {
    problems.push(`missing ${PREFERRED_RESPONSE_FIELDS.livekitUrl}`);
  } else if (!isSecureWebSocketUrl(livekitUrl)) {
    problems.push(`${PREFERRED_RESPONSE_FIELDS.livekitUrl} must be a wss:// URL`);
  }

  if (!sessionId) problems.push(`missing ${PREFERRED_RESPONSE_FIELDS.sessionId}`);

  if (!expiresAt) {
    problems.push(`missing ${PREFERRED_RESPONSE_FIELDS.expiresAt}`);
  } else {
    const parsed = Date.parse(expiresAt);
    if (Number.isNaN(parsed)) {
      problems.push(`${PREFERRED_RESPONSE_FIELDS.expiresAt} is not a valid ISO-8601 timestamp`);
    } else if (parsed <= now) {
      problems.push(`${PREFERRED_RESPONSE_FIELDS.expiresAt} is already in the past`);
    }
  }

  const canonicalLanguage = canonicalizeLanguage(language);
  if (!language) {
    problems.push(`missing ${PREFERRED_RESPONSE_FIELDS.language}`);
  } else if (!canonicalLanguage) {
    problems.push(`${PREFERRED_RESPONSE_FIELDS.language} "${language}" is not one of en, he, ar`);
  }
  if (
    canonicalLanguage &&
    options.expectedLanguage &&
    canonicalLanguage !== options.expectedLanguage
  ) {
    problems.push(
      `response language does not match requested language`,
    );
  }

  const recording = parseRecording(pickRecord(raw, ALIASES.recording));

  if (recording.status === 'malformed' && recording.required) {
    problems.push(recording.reason);
  }

  // v1 is not recorded. A response that hands over a joinable token *and*
  // demands recording consent is refused outright rather than reconciled.
  if (token && recording.status === 'ok' && recording.consent.required) {
    problems.push('response carries a usable token together with recording.required=true');
  }
  if (token && recording.status === 'malformed' && recording.required) {
    problems.push('response carries a usable token together with a required recording block');
  }

  if (problems.length > 0) throw new ContractViolation(problems);

  const session: DemoSession = {
    token: token as string,
    livekitUrl: livekitUrl as string,
    sessionId: sessionId as string,
    expiresAt: expiresAt as string,
    language: canonicalLanguage as DemoLocale,
  };
  if (recording.status === 'ok') session.recording = recording.consent;
  return session;
}

/**
 * Guards against a credential that must never reach a browser.
 *
 * Covers both Supabase key generations: the legacy JWT whose payload carries
 * `"role":"service_role"` (visually near-identical to the anon key), and the
 * modern `sb_secret_*` keys. `sb_publishable_*` is the browser-safe counterpart
 * and is deliberately not matched.
 */
export function looksLikeServerSecret(value: string): boolean {
  if (!value) return false;

  const parts = value.split('.');
  if (parts.length === 3 && parts[1]) {
    try {
      const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      if (/"role"\s*:\s*"service_role"/.test(atob(payload))) return true;
    } catch {
      // Not decodable base64 — fall through to the textual checks.
    }
  }

  return (
    /^sb_secret_/i.test(value.trim()) ||
    /service_role|SUPABASE_SERVICE|SERVICE_ROLE_KEY/i.test(value) ||
    /LIVEKIT_API_SECRET|LIVEKIT_SECRET/i.test(value) ||
    /\bsk_live_|\bsk_test_|secret_key/i.test(value)
  );
}
