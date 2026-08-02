/**
 * The same-origin Vercel Edge Function behind GET /api/voice-demo-language.
 *
 * It exists for exactly one reason: Supabase does not reliably forward
 * `cf-ipcountry`, so the country has to be read where it IS reliable — on
 * Vercel's edge, as `x-vercel-ip-country`.
 *
 * It answers one question and reveals nothing else. The country itself is an
 * input, never an output: the browser learns "he", and not which country
 * produced it.
 */

import { describe, expect, it, vi } from 'vitest';
import handler, { config } from '../src/api/voice-demo-language';

function get(country?: string | null, method = 'GET'): Request {
  const headers = new Headers();
  if (country !== undefined && country !== null) headers.set('x-vercel-ip-country', country);
  // Headers a real request carries, none of which may influence the answer.
  headers.set('x-forwarded-for', '203.0.113.42');
  headers.set('cf-ipcountry', 'JP');
  return new Request('https://www.seenn.ai/api/voice-demo-language', { method, headers });
}

async function body(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

describe('runtime', () => {
  it('is declared as an edge function', () => {
    expect(config.runtime).toBe('edge');
  });
});

describe('resolution', () => {
  it('IL → he', async () => {
    expect(await body(await handler(get('IL')))).toEqual({ language: 'he' });
  });

  it.each(['AE', 'EG', 'SA', 'MA', 'PS', 'YE', 'KM', 'TD'])('%s → ar', async (country) => {
    expect(await body(await handler(get(country)))).toEqual({ language: 'ar' });
  });

  it.each(['US', 'GB', 'FR', 'JP'])('%s → en', async (country) => {
    expect(await body(await handler(get(country)))).toEqual({ language: 'en' });
  });

  it.each([['XX'], ['T1'], ['USA'], [''], ['  ']])('%s → null', async (country) => {
    expect(await body(await handler(get(country)))).toEqual({ language: null });
  });

  it('a missing header → null', async () => {
    expect(await body(await handler(get(undefined)))).toEqual({ language: null });
  });

  it('ignores cf-ipcountry entirely — that is the header that proved unreliable', async () => {
    // cf-ipcountry says JP on every request in this suite; only the Vercel
    // header may decide.
    expect(await body(await handler(get('IL')))).toEqual({ language: 'he' });
    expect(await body(await handler(get(undefined)))).toEqual({ language: null });
  });
});

describe('the response reveals nothing but the language', () => {
  it('has exactly one property', async () => {
    const payload = await body(await handler(get('IL')));
    expect(Object.keys(payload)).toEqual(['language']);
  });

  it('never contains the country code or an IP, in any branch', async () => {
    for (const country of ['IL', 'EG', 'US', 'XX', 'T1']) {
      const raw = await (await handler(get(country))).text();
      expect(raw, country).not.toContain(country);
      expect(raw, country).not.toContain('203.0.113.42');
      expect(raw.toLowerCase(), country).not.toContain('country');
      expect(raw.toLowerCase(), country).not.toContain('ip');
    }
  });

  it('logs nothing at all', async () => {
    const spies = [
      vi.spyOn(console, 'log').mockImplementation(() => undefined),
      vi.spyOn(console, 'warn').mockImplementation(() => undefined),
      vi.spyOn(console, 'error').mockImplementation(() => undefined),
      vi.spyOn(console, 'info').mockImplementation(() => undefined),
      vi.spyOn(console, 'debug').mockImplementation(() => undefined),
    ];

    await handler(get('IL'));
    await handler(get('XX'));
    await handler(get(undefined));

    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });
});

describe('response headers', () => {
  it('are exactly what the brief requires', async () => {
    const response = await handler(get('IL'));
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(response.headers.get('Content-Type')).toBe('application/json');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  it('are set on the null branch too, so an unknown country is never cached', async () => {
    const response = await handler(get('XX'));
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(response.status).toBe(200);
  });
});

describe('method handling', () => {
  it.each(['POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])(
    '%s → 405',
    async (method) => {
      const response = await handler(get('IL', method));
      expect(response.status).toBe(405);
    },
  );

  it('a rejected method still leaks nothing', async () => {
    const response = await handler(get('IL', 'POST'));
    const raw = await response.text();
    expect(raw).not.toContain('IL');
    expect(raw).not.toContain('203.0.113.42');
  });

  it('GET is 200', async () => {
    expect((await handler(get('IL'))).status).toBe(200);
  });
});
