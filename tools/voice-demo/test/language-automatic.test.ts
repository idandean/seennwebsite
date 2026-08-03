/**
 * Automatic language is the only behaviour the visitor sees.
 *
 * The same-origin lookup resolves one canonical starting language from the
 * visitor's approximate network country. Every session request must carry that
 * `he`, `en` or `ar` value. If resolution still fails after retry, the
 * widget must not create a session. The agent may still adapt after hearing
 * the visitor.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicVoiceDemoClient } from '../src/client';
import { VoiceDemoWidget } from '../src/widget';
import { DEFAULT_CONFIG } from '../src/config';
import type { VoiceDemoConfig } from '../src/config';
import type { WidgetDeps } from '../src/widget';
import type { TransportEvents, VoiceTransport } from '../src/transport';

const SESSION_BODY = {
  token: 'jwt',
  livekit_url: 'wss://x.livekit.cloud',
  session_id: 'demo-1',
  expires_at: new Date(Date.now() + 120_000).toISOString(),
  language: 'he',
};

function stubFetch(body: unknown = SESSION_BODY) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const impl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return {
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => body,
    } as unknown as Response;
  });
  return { impl: impl as unknown as typeof fetch, calls };
}

function makeClient(fetchImpl: typeof fetch) {
  return new PublicVoiceDemoClient({
    baseUrl: 'https://stub.supabase.co',
    anonKey: 'anon-key',
    path: '/functions/v1/public-voice-demo',
    requireTurnstileToken: true,
    fetchImpl,
  });
}

/** The exact assertion the product decision calls for. */
function sentBody(calls: Array<{ init: RequestInit }>): Record<string, unknown> {
  return JSON.parse(calls[0]!.init.body as string) as Record<string, unknown>;
}

// --- widget-level scaffolding ------------------------------------------------

function enabledConfig(overrides: Partial<VoiceDemoConfig> = {}): VoiceDemoConfig {
  return {
    ...DEFAULT_CONFIG,
    publicDemoMode: 'enabled',
    endpointBaseUrl: 'https://stub.supabase.co',
    anonKey: 'anon-key',
    turnstileSiteKey: 'site-key',
    ...overrides,
  };
}

function fakeMicrophone() {
  const track = { stop: vi.fn(), kind: 'audio' };
  return {
    track,
    stream: {
      getTracks: () => [track],
      getAudioTracks: () => [track],
    } as unknown as MediaStream,
  };
}

function readyTransport() {
  let bus: TransportEvents | null = null;
  return {
    factory: (events: TransportEvents): VoiceTransport => {
      bus = events;
      return {
        connect: async () => {
          bus?.onConnected();
          bus?.onAgentState('listening');
        },
        disconnect: async () => undefined,
      };
    },
  };
}

const flush = async (times = 10): Promise<void> => {
  for (let i = 0; i < times; i += 1) await Promise.resolve();
};

/** Stubs the same-origin lookup endpoint. `null` => resolver unavailable. */
function stubLookup(language: 'he' | 'en' | 'ar' | null | 'reject' | 'http-500') {
  return vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => {
    if (language === 'reject') throw new TypeError('network down');
    if (language === 'http-500') {
      return { ok: false, status: 500, json: async () => ({}) } as unknown as Response;
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ language }),
    } as unknown as Response;
  });
}

async function startWidget(
  pageLang: string,
  config: Partial<VoiceDemoConfig> = {},
  lookup: ReturnType<typeof stubLookup> = stubLookup('he'),
) {
  document.documentElement.setAttribute('lang', pageLang);
  const mount = document.createElement('div');
  mount.setAttribute('data-seenn-voice-demo', '');
  document.body.appendChild(mount);

  const { impl, calls } = stubFetch();
  const mic = fakeMicrophone();

  const deps: WidgetDeps = {
    requestMicrophone: async () => mic.stream,
    createClient: (resolved) =>
      new PublicVoiceDemoClient({
        baseUrl: resolved.endpointBaseUrl,
        anonKey: resolved.anonKey,
        path: resolved.endpointPath,
        requireTurnstileToken: true,
        fetchImpl: impl,
      }),
    createTransport: readyTransport().factory,
    createTurnstile: () => ({
      getToken: vi.fn(async () => 'ts-token'),
      reset: vi.fn(),
      destroy: vi.fn(),
    }),
  };

  const realFetch = globalThis.fetch;
  globalThis.fetch = lookup as unknown as typeof fetch;

  const widget = new VoiceDemoWidget(mount, enabledConfig(config), deps);
  await widget.start();
  await flush();

  globalThis.fetch = realFetch;
  return { widget, mount, calls, lookup, mic };
}

beforeEach(() => {
  document.body.innerHTML = '';
  document.documentElement.setAttribute('lang', 'en');
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn() },
  });
});

describe('the session client requires a canonical language', () => {
  it('serializes exactly he, en or ar', async () => {
    for (const language of ['he', 'en', 'ar'] as const) {
      const { impl, calls } = stubFetch({ ...SESSION_BODY, language });
      await makeClient(impl).createSession({ language, turnstileToken: 'ts' });
      expect(sentBody(calls)['language']).toBe(language);
    }
  });

  it('refuses missing or non-canonical values without posting', async () => {
    for (const language of [undefined, null, '', 'auto', 'EN', 'he-IL']) {
      const { impl, calls } = stubFetch();
      await expect(
        makeClient(impl).createSession({
          language: language as 'he',
          turnstileToken: 'ts',
        }),
      ).rejects.toMatchObject({ code: 'contract_violation' });
      expect(calls, String(language)).toHaveLength(0);
    }
  });
});

describe('no browser or page language is silently serialized', () => {
  it('the page language never reaches the request, in any locale', async () => {
    const cases = [
      ['en', 'he'],
      ['he', 'ar'],
      ['ar', 'en'],
      ['he-IL', 'ar'],
      ['fr', 'he'],
    ] as const;
    for (const [pageLang, resolved] of cases) {
      document.body.innerHTML = '';
      const { calls } = await startWidget(pageLang, {}, stubLookup(resolved));
      const body = sentBody(calls);

      expect(body['language'], pageLang).toBe(resolved);
    }
  });

  it('navigator.language is never read into the request', async () => {
    const original = Object.getOwnPropertyDescriptor(navigator, 'language');
    Object.defineProperty(navigator, 'language', { configurable: true, value: 'de-DE' });

    const { calls } = await startWidget('en');
    const raw = calls[0]!.init.body as string;

    expect(raw).not.toContain('de');
    expect(sentBody(calls)['language']).toBe('he');

    if (original) Object.defineProperty(navigator, 'language', original);
  });

  it('the widget still RENDERS in the page language — display is not the request', async () => {
    const { mount } = await startWidget('he');
    // Rendering follows the page; the request uses the country-resolved value.
    expect(mount.querySelector('.svd')!.getAttribute('lang')).toBe('he');
  });
});

describe('future explicit override (not exposed in the UI)', () => {
  it('serializes exactly he, en or ar when set internally', async () => {
    for (const value of ['he', 'en', 'ar'] as const) {
      const { impl, calls } = stubFetch({ ...SESSION_BODY, language: value });
      await makeClient(impl).createSession({ turnstileToken: 'ts', language: value });

      const body = sentBody(calls);
      expect(Object.prototype.hasOwnProperty.call(body, 'language'), value).toBe(true);
      expect(body['language'], value).toBe(value);
    }
  });

  it('is off by default in the shipped config', () => {
    expect(DEFAULT_CONFIG.languageOverride).toBeNull();
  });

  it('is not exposed as a control anywhere in the widget', async () => {
    const { mount } = await startWidget('en');
    expect(mount.querySelector('select')).toBeNull();
    expect(mount.querySelector('[name="language"]')).toBeNull();
    expect(mount.querySelector('form')).toBeNull();
  });
});

describe('canonical response language', () => {
  it('accepts he, en and ar as the initial session language', async () => {
    for (const language of ['he', 'en', 'ar'] as const) {
      const { impl } = stubFetch({ ...SESSION_BODY, language });
      const result = await makeClient(impl).createSession({ language, turnstileToken: 'ts' });

      expect(result.kind).toBe('session');
      if (result.kind === 'session') expect(result.session.language).toBe(language);
    }
  });

  it('records it as the initial session language without locking the UI', async () => {
    // Page is English; the backend resolved Hebrew for the greeting.
    const { widget, mount } = await startWidget('en');

    expect(widget.snapshot.session?.language).toBe('he');
    // The widget keeps rendering in the page's language — the conversation is
    // not locked, so the UI must not imply that it is.
    expect(mount.querySelector('.svd')!.getAttribute('lang')).toBe('en');
  });
});

describe('no language control is offered', () => {
  it('shows no selector, form or language input', async () => {
    const { mount } = await startWidget('en');
    expect(mount.querySelector('select')).toBeNull();
    expect(mount.querySelector('form')).toBeNull();
    expect(mount.querySelector('[name="language"]')).toBeNull();
  });
});

describe('unrelated contracts are untouched', () => {
  it('still sends the turnstile token', async () => {
    const { impl, calls } = stubFetch();
    await makeClient(impl).createSession({ language: 'he', turnstileToken: 'ts-token-1' });
    expect(sentBody(calls)['turnstile_token']).toBe('ts-token-1');
  });

  it('still refuses to post without a required turnstile token', async () => {
    const { impl, calls } = stubFetch();
    await expect(makeClient(impl).createSession({ language: 'he' })).rejects.toMatchObject({
      code: 'verification_failed',
    });
    expect(calls).toHaveLength(0);
  });

  it('still sends the anon key and no Authorization header', async () => {
    const { impl, calls } = stubFetch();
    await makeClient(impl).createSession({ language: 'he', turnstileToken: 'ts' });

    const headers = calls[0]!.init.headers as Record<string, string>;
    expect(headers['apikey']).toBe('anon-key');
    expect(headers['Authorization']).toBeUndefined();
  });

  it('still never sends phone, tenant, amount or balance_month', async () => {
    const { impl, calls } = stubFetch();
    await makeClient(impl).createSession({ language: 'he', turnstileToken: 'ts' });

    const body = sentBody(calls);
    for (const forbidden of ['destination_phone', 'tenant_id', 'amount', 'balance_month']) {
      expect(body, forbidden).not.toHaveProperty(forbidden);
    }
  });

  it('still requires the full LiveKit session contract', async () => {
    const { impl } = stubFetch({ token: 'only-a-token' });
    await expect(
      makeClient(impl).createSession({ language: 'he', turnstileToken: 'ts' }),
    ).rejects.toMatchObject({
      code: 'contract_violation',
    });
  });
});


describe('country-resolved initial language', () => {
  it('sends the resolved language when the lookup answers', async () => {
    for (const language of ['he', 'en', 'ar'] as const) {
      document.body.innerHTML = '';
      const { calls } = await startWidget('en', {}, stubLookup(language));
      const body = sentBody(calls);

      expect(Object.prototype.hasOwnProperty.call(body, 'language'), language).toBe(true);
      expect(body['language'], language).toBe(language);
    }
  });

  it('fails closed without creating a session when the lookup returns null', async () => {
    const { widget, calls, lookup, mic } = await startWidget('en', {}, stubLookup(null));

    expect(lookup).toHaveBeenCalledTimes(2);
    expect(calls).toHaveLength(0);
    expect(widget.snapshot.state).toBe('error');
    expect(widget.snapshot.errorCode).toBe('language_unavailable');
    expect(mic.track.stop).toHaveBeenCalledTimes(1);
  });

  it('fails closed without creating a session when the lookup fails outright', async () => {
    for (const failure of ['reject', 'http-500'] as const) {
      document.body.innerHTML = '';
      const { widget, calls, lookup } = await startWidget('en', {}, stubLookup(failure));
      expect(lookup, failure).toHaveBeenCalledTimes(2);
      expect(calls, failure).toHaveLength(0);
      expect(widget.snapshot.errorCode, failure).toBe('language_unavailable');
    }
  });

  it('retries a transient lookup failure and sends the recovered language', async () => {
    const lookup = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('temporary failure'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ language: 'he' }),
      } as Response);

    const { widget, calls } = await startWidget('en', {}, lookup);

    expect(lookup).toHaveBeenCalledTimes(2);
    expect(calls).toHaveLength(1);
    expect(sentBody(calls)).toHaveProperty('language', 'he');
    expect(widget.snapshot.state).toBe('listening');
  });

  it('aborts two hung lookup attempts, posts no session, and cleans up the microphone', async () => {
    const aborted: AbortSignal[] = [];
    const lookup = vi.fn(
      async (_url: string | URL | Request, init?: RequestInit): Promise<Response> =>
        await new Promise((_resolve, reject) => {
          const signal = init?.signal;
          if (!signal) throw new Error('lookup did not receive an AbortSignal');
          signal.addEventListener(
            'abort',
            () => {
              aborted.push(signal);
              reject(new DOMException('timed out', 'AbortError'));
            },
            { once: true },
          );
        }),
    );

    const { widget, calls, mic } = await startWidget(
      'en',
      { languageLookupTimeoutMs: 10 },
      lookup as ReturnType<typeof stubLookup>,
    );

    expect(lookup).toHaveBeenCalledTimes(2);
    expect(aborted).toHaveLength(2);
    expect(aborted.every((signal) => signal.aborted)).toBe(true);
    expect(calls).toHaveLength(0);
    expect(widget.snapshot.errorCode).toBe('language_unavailable');
    expect(mic.track.stop).toHaveBeenCalledTimes(1);
  });

  it('calls the SAME-ORIGIN path, never Supabase', async () => {
    const { lookup } = await startWidget('en', {}, stubLookup('he'));
    const url = String(lookup.mock.calls[0]![0]);

    expect(url).toBe('/api/voice-demo-language');
    expect(url).not.toContain('supabase');
    expect(url).not.toContain('http');
  });

  it('still POSTs the session straight to Supabase — the lookup is not a proxy', async () => {
    const { calls } = await startWidget('en', {}, stubLookup('he'));
    expect(calls[0]!.url).toBe('https://stub.supabase.co/functions/v1/public-voice-demo');
  });

  it('fails closed on a lookup answer outside he/en/ar', async () => {
    for (const bogus of ['auto', 'fr', '', 'EN']) {
      document.body.innerHTML = '';
      const { widget, calls, lookup } = await startWidget(
        'en',
        {},
        stubLookup(bogus as unknown as 'he'),
      );
      expect(lookup, bogus).toHaveBeenCalledTimes(2);
      expect(calls, bogus).toHaveLength(0);
      expect(widget.snapshot.errorCode, bogus).toBe('language_unavailable');
    }
  });

  it('an empty lookup URL fails closed unless an explicit language is configured', async () => {
    const lookup = stubLookup('he');
    const { widget, calls } = await startWidget('en', { languageLookupUrl: '' }, lookup);

    expect(lookup).not.toHaveBeenCalled();
    expect(calls).toHaveLength(0);
    expect(widget.snapshot.errorCode).toBe('language_unavailable');
  });

  it('never sends a country code, only a language', async () => {
    const { calls } = await startWidget('en', {}, stubLookup('ar'));
    const raw = calls[0]!.init.body as string;

    expect(raw).toContain('"language":"ar"');
    for (const country of ['IL', 'EG', 'SA', 'US', 'country']) {
      expect(raw, country).not.toContain(country);
    }
  });
});
