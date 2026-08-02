/**
 * Country → initial demo language.
 *
 * Production evidence: the website correctly omitted `language`, but the
 * session still stored `language=en`, because Supabase does not reliably
 * forward `cf-ipcountry` into Edge Function headers. A same-origin Vercel
 * Function reads `x-vercel-ip-country` instead and answers this one question.
 *
 * This module is the whole decision, kept pure so the mapping is testable
 * without a request. It maps a country to a STARTING language — the agent
 * still detects and switches once it hears the visitor.
 */

import { describe, expect, it } from 'vitest';
import { ARABIC_PRIMARY_COUNTRIES, languageForCountry } from '../src/country-language';

/** Exactly the list the product decision specifies. */
const ARABIC = [
  'AE', 'BH', 'DZ', 'EG', 'EH', 'IQ', 'JO', 'KM', 'KW', 'LB', 'LY',
  'MA', 'MR', 'OM', 'PS', 'QA', 'SA', 'SY', 'TD', 'TN', 'YE',
];

describe('Hebrew', () => {
  it('IL → he', () => {
    expect(languageForCountry('IL')).toBe('he');
  });
});

describe('Arabic-primary countries', () => {
  it('the shipped list matches the specified set exactly', () => {
    expect([...ARABIC_PRIMARY_COUNTRIES].sort()).toEqual([...ARABIC].sort());
  });

  it.each(ARABIC)('%s → ar', (country) => {
    expect(languageForCountry(country)).toBe('ar');
  });
});

describe('everything else valid', () => {
  it.each(['US', 'GB', 'FR', 'DE', 'IN', 'BR', 'JP', 'AU', 'CA', 'ZA', 'NG', 'TR'])(
    '%s → en',
    (country) => {
      expect(languageForCountry(country)).toBe('en');
    },
  );
});

describe('unknown or unusable → null, never a guess', () => {
  it('missing header', () => {
    expect(languageForCountry(null)).toBeNull();
    expect(languageForCountry(undefined)).toBeNull();
    expect(languageForCountry('')).toBeNull();
  });

  it('XX (Vercel: unknown) and T1 (Tor)', () => {
    expect(languageForCountry('XX')).toBeNull();
    expect(languageForCountry('T1')).toBeNull();
  });

  it('malformed values', () => {
    for (const bad of ['U', 'USA', '12', 'U1', '  ', 'us-CA', '**', 'IL;DROP']) {
      expect(languageForCountry(bad), bad).toBeNull();
    }
  });

  it('null is distinct from en — an unknown country must not default to English', () => {
    // Omitting the property lets the backend decide; sending "en" would pin it.
    expect(languageForCountry('XX')).not.toBe('en');
  });
});

describe('normalisation', () => {
  it('accepts lower case and surrounding whitespace', () => {
    expect(languageForCountry('il')).toBe('he');
    expect(languageForCountry(' eg ')).toBe('ar');
    expect(languageForCountry('us')).toBe('en');
  });
});

describe('output vocabulary', () => {
  it('only ever returns he, en, ar or null', () => {
    const samples = ['IL', ...ARABIC, 'US', 'GB', 'XX', 'T1', '', 'nonsense'];
    for (const sample of samples) {
      expect([null, 'he', 'en', 'ar'], sample).toContain(languageForCountry(sample));
    }
  });
});
