/**
 * The only module permitted to touch the console (enforced by the `no-console`
 * ESLint rule everywhere else).
 *
 * Everything it prints goes through `redact()` first. The widget handles a
 * short-lived LiveKit participant token and a Supabase anon key, and neither
 * belongs in a browser console where it survives in a bug report screenshot.
 */

const TOKEN_LIKE = [
  // JWTs — the participant token and the anon key are both this shape.
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+/g,
  // Anything after a token-ish key in a serialised object.
  /("?(?:token|apikey|api_key|authorization|access_token|participant_token|key)"?\s*[:=]\s*"?)([^",\s}]+)/gi,
];

const REDACTED = '[redacted]';

export function redact(value: unknown): unknown {
  if (typeof value === 'string') return redactString(value);
  if (value instanceof Error) return `${value.name}: ${redactString(value.message)}`;
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      out[key] = /token|apikey|api_key|authorization|key|secret/i.test(key)
        ? REDACTED
        : redact(inner);
    }
    return out;
  }
  return value;
}

function redactString(input: string): string {
  let out = input;
  out = out.replace(TOKEN_LIKE[0]!, REDACTED);
  out = out.replace(TOKEN_LIKE[1]!, (_m, prefix: string) => `${prefix}${REDACTED}`);
  return out;
}

/** URLs are logged host-only: a signed URL can carry a token in its query. */
export function safeUrl(raw: string): string {
  try {
    const url = new URL(raw);
    return `${url.protocol}//${url.host}${url.pathname}`;
  } catch {
    return '[unparseable url]';
  }
}

export interface Logger {
  warn(message: string, detail?: unknown): void;
  error(message: string, detail?: unknown): void;
}

/** Prefixed so these lines are attributable in a noisy marketing-page console. */
export const logger: Logger = {
  warn(message, detail) {
    if (detail === undefined) console.warn(`[voice-demo] ${message}`);
    else console.warn(`[voice-demo] ${message}`, redact(detail));
  },
  error(message, detail) {
    if (detail === undefined) console.error(`[voice-demo] ${message}`);
    else console.error(`[voice-demo] ${message}`, redact(detail));
  },
};
