/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Built from tools/voice-demo/src by tools/voice-demo/scripts/build.mjs.
 * Edit the TypeScript source and re-run `npm run build` in tools/voice-demo.
 *
 * The public voice demo is enabled only by a window.SEENN_VOICE_DEMO block in
 * the page — see tools/voice-demo/CONFIGURATION.md. Nothing is baked in here.
 */

// src/country-language.ts
var ARABIC_PRIMARY_COUNTRIES = [
  "AE",
  // United Arab Emirates
  "BH",
  // Bahrain
  "DZ",
  // Algeria
  "EG",
  // Egypt
  "EH",
  // Western Sahara
  "IQ",
  // Iraq
  "JO",
  // Jordan
  "KM",
  // Comoros
  "KW",
  // Kuwait
  "LB",
  // Lebanon
  "LY",
  // Libya
  "MA",
  // Morocco
  "MR",
  // Mauritania
  "OM",
  // Oman
  "PS",
  // Palestine
  "QA",
  // Qatar
  "SA",
  // Saudi Arabia
  "SY",
  // Syria
  "TD",
  // Chad
  "TN",
  // Tunisia
  "YE"
  // Yemen
];
var ARABIC = new Set(ARABIC_PRIMARY_COUNTRIES);
var UNKNOWN = /* @__PURE__ */ new Set(["XX", "T1"]);
function languageForCountry(raw) {
  if (typeof raw !== "string") return null;
  const code = raw.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return null;
  if (UNKNOWN.has(code)) return null;
  if (code === "IL") return "he";
  if (ARABIC.has(code)) return "ar";
  return "en";
}

// src/api/voice-demo-language.ts
var config = { runtime: "edge" };
var COUNTRY_HEADER = "x-vercel-ip-country";
var HEADERS = {
  "Content-Type": "application/json",
  // Per-visitor and never stored: a cached answer would hand one visitor's
  // country-derived language to another.
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff"
};
function isWebRequest(value) {
  return typeof value?.headers?.get === "function";
}
function handler(request, response) {
  if (isWebRequest(request)) {
    if (request.method !== "GET") {
      return new Response(null, { status: 405, headers: { ...HEADERS, Allow: "GET" } });
    }
    const language = languageForCountry(request.headers.get(COUNTRY_HEADER));
    return new Response(JSON.stringify({ language }), { status: 200, headers: HEADERS });
  }
  if (!response) return;
  for (const [name, value] of Object.entries(HEADERS)) response.setHeader(name, value);
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    response.statusCode = 405;
    response.end();
    return;
  }
  const raw = request.headers[COUNTRY_HEADER];
  const country = Array.isArray(raw) ? raw[0] : raw;
  response.statusCode = 200;
  response.end(JSON.stringify({ language: languageForCountry(country ?? null) }));
}
export {
  config,
  handler as default
};
