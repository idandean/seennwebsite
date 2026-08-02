/**
 * Country → the demo's INITIAL language.
 *
 * ---------------------------------------------------------------------------
 * Why this exists
 * ---------------------------------------------------------------------------
 * The browser correctly sends no `language`, but sessions were still being
 * stored as `en`: Supabase does not reliably forward `cf-ipcountry` into Edge
 * Function request headers, so the backend had nothing to resolve from and
 * fell back. Vercel's own `x-vercel-ip-country` IS reliable on our edge, so a
 * tiny same-origin function reads it and answers this one question.
 *
 * This picks a STARTING language, not a lock. The agent detects and switches
 * once it hears the visitor.
 *
 * Kept pure and free of any request object so the mapping is testable on its
 * own, and so the only thing the network layer does is call it.
 */

export type DemoLanguage = 'he' | 'en' | 'ar';

/**
 * Countries where Arabic is the primary language for a first greeting.
 * Frozen list — changing it changes which greeting real visitors hear.
 */
export const ARABIC_PRIMARY_COUNTRIES: readonly string[] = [
  'AE', // United Arab Emirates
  'BH', // Bahrain
  'DZ', // Algeria
  'EG', // Egypt
  'EH', // Western Sahara
  'IQ', // Iraq
  'JO', // Jordan
  'KM', // Comoros
  'KW', // Kuwait
  'LB', // Lebanon
  'LY', // Libya
  'MA', // Morocco
  'MR', // Mauritania
  'OM', // Oman
  'PS', // Palestine
  'QA', // Qatar
  'SA', // Saudi Arabia
  'SY', // Syria
  'TD', // Chad
  'TN', // Tunisia
  'YE', // Yemen
];

const ARABIC = new Set(ARABIC_PRIMARY_COUNTRIES);

/**
 * Values that mean "we do not know", not "somewhere else".
 * `XX` is Vercel's unknown placeholder; `T1` is the Tor network.
 */
const UNKNOWN = new Set(['XX', 'T1']);

/**
 * Resolves a country code to the demo's initial language.
 *
 * Returns `null` for anything missing, malformed or explicitly unknown. That
 * matters: `null` makes the caller OMIT the language so the backend decides,
 * whereas defaulting to `'en'` would pin an unknown visitor to English — the
 * exact failure this change is fixing.
 */
export function languageForCountry(raw: string | null | undefined): DemoLanguage | null {
  if (typeof raw !== 'string') return null;

  const code = raw.trim().toUpperCase();
  // Exactly two ASCII letters, or we do not trust it.
  if (!/^[A-Z]{2}$/.test(code)) return null;
  if (UNKNOWN.has(code)) return null;

  if (code === 'IL') return 'he';
  if (ARABIC.has(code)) return 'ar';
  return 'en';
}
