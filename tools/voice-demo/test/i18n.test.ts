import { describe, expect, it } from 'vitest';
import { directionFor, isSupported, resolveLocale, stringsFor } from '../src/i18n';
import type { DemoLocale } from '../src/contract';

const LOCALES: DemoLocale[] = ['en', 'he', 'ar'];

describe('resolveLocale', () => {
  it('follows the page language', () => {
    expect(resolveLocale(null, 'en')).toBe('en');
    expect(resolveLocale(null, 'he')).toBe('he');
    expect(resolveLocale(null, 'ar')).toBe('ar');
  });

  it('handles region subtags', () => {
    expect(resolveLocale(null, 'he-IL')).toBe('he');
    expect(resolveLocale(null, 'ar-EG')).toBe('ar');
    expect(resolveLocale(null, 'en-GB')).toBe('en');
  });

  it('accepts the legacy Hebrew code', () => {
    expect(resolveLocale(null, 'iw')).toBe('he');
  });

  it('is case-insensitive', () => {
    expect(resolveLocale(null, 'HE-IL')).toBe('he');
  });

  it('falls back to English for anything unsupported or missing', () => {
    expect(resolveLocale(null, 'fr')).toBe('en');
    expect(resolveLocale(null, null)).toBe('en');
    expect(resolveLocale(null, undefined)).toBe('en');
    expect(resolveLocale(null, '')).toBe('en');
  });

  it('lets explicit config override the page', () => {
    expect(resolveLocale('ar', 'en')).toBe('ar');
    expect(resolveLocale('he', 'en')).toBe('he');
  });
});

describe('direction', () => {
  it('is RTL for Hebrew and Arabic, LTR for English', () => {
    expect(directionFor('en')).toBe('ltr');
    expect(directionFor('he')).toBe('rtl');
    expect(directionFor('ar')).toBe('rtl');
  });
});

describe('isSupported', () => {
  it('accepts exactly the three shipped locales', () => {
    expect(LOCALES.every(isSupported)).toBe(true);
    expect(isSupported('fr')).toBe(false);
    expect(isSupported('')).toBe(false);
  });
});

describe('string packs', () => {
  it('every locale defines every key the English pack defines', () => {
    const keys = Object.keys(stringsFor('en'));
    for (const locale of LOCALES) {
      const pack = stringsFor(locale) as unknown as Record<string, string>;
      const missing = keys.filter((key) => !pack[key]);
      expect(missing, `${locale} is missing: ${missing.join(', ')}`).toEqual([]);
    }
  });

  it('no locale leaves a string empty', () => {
    for (const locale of LOCALES) {
      const pack = stringsFor(locale) as unknown as Record<string, string>;
      for (const [key, value] of Object.entries(pack)) {
        expect(typeof value, `${locale}.${key}`).toBe('string');
        expect(value.trim().length, `${locale}.${key}`).toBeGreaterThan(0);
      }
    }
  });

  it('the Hebrew and Arabic packs are actually translated, not English copies', () => {
    const en = stringsFor('en');
    for (const locale of ['he', 'ar'] as const) {
      const pack = stringsFor(locale);
      expect(pack.readyTitle).not.toBe(en.readyTitle);
      expect(pack.errorTitle).not.toBe(en.errorTitle);
    }
  });

  it('ships no recording-consent wording — that copy is the server’s', () => {
    for (const locale of LOCALES) {
      const pack = stringsFor(locale) as unknown as Record<string, string>;
      // Only the frame (heading + buttons) may exist locally.
      expect(Object.keys(pack).filter((k) => k.startsWith('consent'))).toEqual([
        'consentHeading',
        'consentAccept',
        'consentDecline',
        'consentPolicyLink',
      ]);
    }
  });
});
