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

export default function handler(request: Request): Response {
  if (request.method !== 'GET') {
    // No body: even a rejection should describe nothing about the caller.
    return new Response(null, { status: 405, headers: { ...HEADERS, Allow: 'GET' } });
  }

  const language = languageForCountry(request.headers.get(COUNTRY_HEADER));

  // The entire response. `null` tells the browser to omit `language` from its
  // Supabase POST so the backend decides, rather than pinning it to English.
  return new Response(JSON.stringify({ language }), { status: 200, headers: HEADERS });
}
