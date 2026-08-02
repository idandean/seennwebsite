/**
 * GET /api/voice-demo-language — Vercel Edge Function.
 *
 * Answers one question: which language should the demo open in?
 *
 * It exists because Supabase does not reliably forward `cf-ipcountry` into
 * Edge Function request headers, so the backend could not resolve a country
 * and every session was stored as `en`. Vercel's `x-vercel-ip-country` is
 * reliable on our own edge, so the browser asks here first and passes the
 * answer along in the direct Supabase POST.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS DOES NOT DO
 * ---------------------------------------------------------------------------
 * It does NOT proxy the Supabase `public-voice-demo` POST. The browser keeps
 * calling Supabase directly, so that endpoint still sees the visitor's real
 * connection — which is what its per-IP rate limiting and Turnstile
 * verification depend on. Proxying would make every visitor look like Vercel.
 *
 * The country is an INPUT and never an output. The browser learns `"he"`; it
 * does not learn which country produced it. Nothing is logged: no IP, no
 * country, no headers, and this function never sees a Turnstile or LiveKit
 * token in the first place.
 *
 * Built from TypeScript into the committed /api/voice-demo-language.js by
 * tools/voice-demo/scripts/build.mjs. Edit the source, not the artifact.
 */

import { languageForCountry } from '../country-language';

export const config = { runtime: 'edge' };

/** Vercel's geo header. Deliberately the only header consulted. */
const COUNTRY_HEADER = 'x-vercel-ip-country';

const HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  // Per-visitor and never stored: a cached answer would hand one visitor's
  // country-derived language to another.
  'Cache-Control': 'private, no-store',
  'X-Content-Type-Options': 'nosniff',
};

/** The Node serverless shape, used only by the compatibility path below. */
interface NodeRequest {
  method?: string | undefined;
  headers: Record<string, string | string[] | undefined>;
}
interface NodeResponse {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(body?: string): void;
}

function isWebRequest(value: unknown): value is Request {
  return typeof (value as Request | undefined)?.headers?.get === 'function';
}

/**
 * Handles BOTH invocation shapes on purpose.
 *
 * The edge path is the intended one and is what the Web `Request` branch does.
 * The Node branch exists because the runtime marker is easy to lose: this file
 * is bundled, so `export const config` reaches Vercel as
 * `var config = {...}; export { config }`, and if its static analysis does not
 * recognise that form the function is built as a Node serverless function and
 * invoked as `(req, res)`. That mismatch is a 500 — observed in production as
 * FUNCTION_INVOCATION_FAILED — for a file that is otherwise perfectly correct.
 *
 * Supporting both makes the endpoint independent of that detail. The answer,
 * the headers and the silence are identical either way.
 */
export default function handler(
  request: Request | NodeRequest,
  response?: NodeResponse,
): Response | void {
  // --- Edge: Web Request in, Web Response out ------------------------------
  if (isWebRequest(request)) {
    if (request.method !== 'GET') {
      // No body: even a rejection should describe nothing about the caller.
      return new Response(null, { status: 405, headers: { ...HEADERS, Allow: 'GET' } });
    }

    const language = languageForCountry(request.headers.get(COUNTRY_HEADER));

    // The entire response. `null` tells the browser to omit `language` from
    // its Supabase POST so the backend decides, rather than pinning English.
    return new Response(JSON.stringify({ language }), { status: 200, headers: HEADERS });
  }

  // --- Node serverless: (req, res) -----------------------------------------
  if (!response) return;

  for (const [name, value] of Object.entries(HEADERS)) response.setHeader(name, value);

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    response.statusCode = 405;
    response.end();
    return;
  }

  // Node lower-cases incoming header names.
  const raw = request.headers[COUNTRY_HEADER];
  const country = Array.isArray(raw) ? raw[0] : raw;

  response.statusCode = 200;
  response.end(JSON.stringify({ language: languageForCountry(country ?? null) }));
}
