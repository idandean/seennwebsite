/**
 * Automatic language is the only behaviour the visitor sees.
 *
 * The request must carry NO `language` property at all — not "auto", not null,
 * not "", and above all not `navigator.language` or the page's `<html lang>`.
 * The backend picks the initial greeting from the visitor's approximate
 * network country, and the agent adapts once it hears them. Sending a language
 * from the browser would quietly override that and lock the conversation to
 * whatever the page happened to be in.
 *
 * The property must be ABSENT, which is stricter than being undefined:
 * `JSON.stringify` drops an explicit `undefined`, but an explicit `null` or
 * `""` would survive and be read as a real instruction by the backend.
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

async function startWidget(pageLang: string, config: Partial<VoiceDemoConfig> = {}) {
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

  const widget = new VoiceDemoWidget(mount, enabledConfig(config), deps);
  await widget.start();
  await flush();
  return { widget, mount, calls };
}

beforeEach(() => {
  document.body.innerHTML = '';
  document.documentElement.setAttribute('lang', 'en');
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn() },
  });
});

describe('automatic mode omits the language property entirely', () => {
  it('the property is ABSENT from the request body', async () => {
    const { impl, calls } = stubFetch();
    await makeClient(impl).createSession({ turnstileToken: 'ts' });

    const body = sentBody(calls);
    expect(Object.prototype.hasOwnProperty.call(body, 'language')).toBe(false);
  });

  it('the raw JSON contains no language key at all', async () => {
    const { impl, calls } = stubFetch();
    await makeClient(impl).createSession({ turnstileToken: 'ts' });

    expect(calls[0]!.init.body as string).not.toContain('language');
  });

  it('sends none of the forbidden stand-ins', async () => {
    const { impl, calls } = stubFetch();
    await makeClient(impl).createSession({ turnstileToken: 'ts' });

    const body = sentBody(calls);
    for (const forbidden of ['auto', null, '']) {
      expect(body['language']).not.toBe(forbidden);
    }
    expect(body['language']).toBeUndefined();
  });

  it('automatic leaves only the turnstile token on the wire', async () => {
    const { impl, calls } = stubFetch();
    await makeClient(impl).createSession({ turnstileToken: 'ts' });

    expect(Object.keys(sentBody(calls))).toEqual(['turnstile_token']);
  });
});

describe('no browser or page language is silently serialized', () => {
  it('the page language never reaches the request, in any locale', async () => {
    for (const pageLang of ['en', 'he', 'ar', 'he-IL', 'fr']) {
      document.body.innerHTML = '';
      const { calls } = await startWidget(pageLang);
      const body = sentBody(calls);

      expect(Object.prototype.hasOwnProperty.call(body, 'language'), pageLang).toBe(false);
      expect(calls[0]!.init.body as string, pageLang).not.toContain('language');
    }
  });

  it('navigator.language is never read into the request', async () => {
    const original = Object.getOwnPropertyDescriptor(navigator, 'language');
    Object.defineProperty(navigator, 'language', { configurable: true, value: 'de-DE' });

    const { calls } = await startWidget('en');
    const raw = calls[0]!.init.body as string;

    expect(raw).not.toContain('de');
    expect(Object.prototype.hasOwnProperty.call(sentBody(calls), 'language')).toBe(false);

    if (original) Object.defineProperty(navigator, 'language', original);
  });

  it('the widget still RENDERS in the page language — display is not the request', async () => {
    const { mount } = await startWidget('he');
    // Rendering follows the page; the request stays automatic.
    expect(mount.querySelector('.svd')!.getAttribute('lang')).toBe('he');
  });
});

describe('future explicit override (not exposed in the UI)', () => {
  it('serializes exactly he, en or ar when set internally', async () => {
    for (const value of ['he', 'en', 'ar'] as const) {
      const { impl, calls } = stubFetch();
      await makeClient(impl).createSession({ turnstileToken: 'ts', languageOverride: value });

      const body = sentBody(calls);
      expect(Object.prototype.hasOwnProperty.call(body, 'language'), value).toBe(true);
      expect(body['language'], value).toBe(value);
    }
  });

  it('falls back to automatic for anything outside the exact set', async () => {
    for (const bad of ['auto', 'AUTO', 'EN', 'he-IL', 'fr', '', ' he']) {
      const { impl, calls } = stubFetch();
      await makeClient(impl).createSession({
        turnstileToken: 'ts',
        languageOverride: bad as 'he',
      });

      expect(Object.prototype.hasOwnProperty.call(sentBody(calls), 'language'), bad).toBe(false);
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
    for (const language of ['he', 'en', 'ar']) {
      const { impl } = stubFetch({ ...SESSION_BODY, language });
      const result = await makeClient(impl).createSession({ turnstileToken: 'ts' });

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

describe('reassuring copy', () => {
  it('tells the visitor she adapts, with no language form', async () => {
    const { mount } = await startWidget('en');
    const text = mount.textContent ?? '';

    expect(text).toMatch(/adapt to your language/i);
    expect(mount.querySelector('select')).toBeNull();
  });

  it('is present in all three locales', async () => {
    for (const [lang, pattern] of [
      ['en', /adapt to your language/i],
      ['he', /להתאים/],
      ['ar', /لغتك/],
    ] as const) {
      document.body.innerHTML = '';
      const { mount } = await startWidget(lang);
      expect(mount.textContent ?? '', lang).toMatch(pattern);
    }
  });
});

describe('unrelated contracts are untouched', () => {
  it('still sends the turnstile token', async () => {
    const { impl, calls } = stubFetch();
    await makeClient(impl).createSession({ turnstileToken: 'ts-token-1' });
    expect(sentBody(calls)['turnstile_token']).toBe('ts-token-1');
  });

  it('still refuses to post without a required turnstile token', async () => {
    const { impl, calls } = stubFetch();
    await expect(makeClient(impl).createSession({})).rejects.toMatchObject({
      code: 'verification_failed',
    });
    expect(calls).toHaveLength(0);
  });

  it('still sends the anon key and no Authorization header', async () => {
    const { impl, calls } = stubFetch();
    await makeClient(impl).createSession({ turnstileToken: 'ts' });

    const headers = calls[0]!.init.headers as Record<string, string>;
    expect(headers['apikey']).toBe('anon-key');
    expect(headers['Authorization']).toBeUndefined();
  });

  it('still never sends phone, tenant, amount or balance_month', async () => {
    const { impl, calls } = stubFetch();
    await makeClient(impl).createSession({ turnstileToken: 'ts' });

    const body = sentBody(calls);
    for (const forbidden of ['destination_phone', 'tenant_id', 'amount', 'balance_month']) {
      expect(body, forbidden).not.toHaveProperty(forbidden);
    }
  });

  it('still requires the full LiveKit session contract', async () => {
    const { impl } = stubFetch({ token: 'only-a-token' });
    await expect(makeClient(impl).createSession({ turnstileToken: 'ts' })).rejects.toMatchObject({
      code: 'contract_violation',
    });
  });
});
