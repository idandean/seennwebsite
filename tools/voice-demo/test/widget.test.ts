import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VoiceDemoWidget } from '../src/widget';
import { DEFAULT_CONFIG } from '../src/config';
import { PublicVoiceDemoClient } from '../src/client';
import { createTurnstileProvider } from '../src/turnstile';
import { TransportError } from '../src/transport';
import type { VoiceDemoConfig } from '../src/config';
import type { WidgetDeps } from '../src/widget';
import type { ConnectOptions, TransportEvents, VoiceTransport } from '../src/transport';
import type { TurnstileProvider } from '../src/turnstile';

const SESSION_BODY = {
  token: 'jwt',
  livekit_url: 'wss://x.livekit.cloud',
  session_id: 'demo-1',
  expires_at: new Date(Date.now() + 120_000).toISOString(),
  language: 'en',
};

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

/** Hands out a distinct token per call, so reuse is visible in assertions. */
function fakeTurnstile() {
  let issued = 0;
  const getToken = vi.fn(async () => {
    issued += 1;
    return `ts-token-${issued}`;
  });
  const reset = vi.fn();
  const destroy = vi.fn();
  const provider: TurnstileProvider = { getToken, reset, destroy };
  return { provider, factory: () => provider, getToken, reset, destroy };
}

/** A microphone that reports whether it was stopped — the leak check. */
function fakeMicrophone() {
  const track = { stop: vi.fn(), kind: 'audio' };
  const stream = { getTracks: () => [track], getAudioTracks: () => [track] };
  return { stream: stream as unknown as MediaStream, track };
}

/**
 * The default fake is a call where everything works, agent included: it
 * announces the room connection and then a ready agent, because readiness now
 * comes from the agent rather than from our own publication. Pass
 * `{ autoReady: false }` to stop at room-connected.
 */
function fakeTransport(options: { autoReady?: boolean } = {}) {
  const autoReady = options.autoReady !== false;
  let captured: TransportEvents | null = null;
  const connect = vi.fn(async (_options: ConnectOptions) => {
    captured?.onConnected();
    if (autoReady) captured?.onAgentState('listening');
  });
  const disconnect = vi.fn(async () => undefined);

  const factory = (events: TransportEvents): VoiceTransport => {
    captured = events;
    return { connect, disconnect };
  };

  return {
    factory,
    connect,
    disconnect,
    get events(): TransportEvents {
      if (!captured) throw new Error('transport was never created');
      return captured;
    },
  };
}

interface StubResponse {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

function stubClient(...responses: StubResponse[]) {
  let index = 0;
  // Params are declared so the recorded calls stay typed at the assertion site.
  const fetchImpl = vi.fn(async (_url: string, _init: RequestInit) => {
    const next = responses[Math.min(index, responses.length - 1)]!;
    index += 1;
    return {
      ok: next.status >= 200 && next.status < 300,
      status: next.status,
      headers: { get: (name: string) => next.headers?.[name.toLowerCase()] ?? null },
      json: async () => next.body,
    } as unknown as Response;
  });
  return {
    fetchImpl,
    create: (config: VoiceDemoConfig) =>
      new PublicVoiceDemoClient({
        baseUrl: config.endpointBaseUrl,
        anonKey: config.anonKey,
        path: config.endpointPath,
        requireTurnstileToken: config.turnstileSiteKey !== '',
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
  };
}

function mountPoint(): HTMLElement {
  const el = document.createElement('div');
  el.setAttribute('data-seenn-voice-demo', '');
  document.body.appendChild(el);
  return el;
}

/** Lets queued promise jobs run. */
const flush = async (times = 6): Promise<void> => {
  for (let i = 0; i < times; i += 1) await Promise.resolve();
};

beforeEach(() => {
  document.body.innerHTML = '';
  document.documentElement.setAttribute('lang', 'en');
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn() },
  });
});

function build(
  config: VoiceDemoConfig,
  deps: WidgetDeps = {},
): { widget: VoiceDemoWidget; mount: HTMLElement } {
  const mount = mountPoint();
  // Default so no test ever reaches for the real Cloudflare script.
  const withTurnstile: WidgetDeps = { createTurnstile: fakeTurnstile().factory, ...deps };
  return { widget: new VoiceDemoWidget(mount, config, withTurnstile), mount };
}

describe('feature flag', () => {
  it('renders the unavailable state when PUBLIC_DEMO_MODE is disabled', () => {
    const { widget, mount } = build({ ...DEFAULT_CONFIG, renderWhenUnavailable: true });
    expect(widget.state).toBe('unavailable');
    expect(mount.querySelector('.svd')?.getAttribute('data-state')).toBe('unavailable');
  });

  it('refuses to start while disabled, and never touches the microphone', async () => {
    const mic = vi.fn();
    const { widget } = build(
      { ...DEFAULT_CONFIG, renderWhenUnavailable: true },
      { requestMicrophone: mic as unknown as () => Promise<MediaStream> },
    );

    await widget.start();

    expect(widget.state).toBe('unavailable');
    expect(mic).not.toHaveBeenCalled();
  });

  it('is ready when the flag is on and an endpoint is configured', () => {
    const { widget } = build(enabledConfig());
    expect(widget.state).toBe('ready');
  });

  it('is unavailable when the flag is on but nothing is configured to call', () => {
    const { widget } = build(
      enabledConfig({ endpointBaseUrl: '', renderWhenUnavailable: true }),
    );
    expect(widget.state).toBe('unavailable');
  });

  it('is unavailable when the flag is on but no Turnstile key is configured', () => {
    const { widget } = build(
      enabledConfig({ turnstileSiteKey: '', renderWhenUnavailable: true }),
    );
    expect(widget.state).toBe('unavailable');
    expect(widget.snapshot.unavailableReason).toBe('turnstile_not_configured');
  });

  it('will not post without a Turnstile key, even if start() is called directly', async () => {
    const client = stubClient({ status: 200, body: SESSION_BODY });
    const mic = fakeMicrophone();
    const { widget } = build(
      enabledConfig({ turnstileSiteKey: '', renderWhenUnavailable: true }),
      { requestMicrophone: async () => mic.stream, createClient: client.create },
    );

    await widget.start();
    await flush();

    expect(client.fetchImpl).not.toHaveBeenCalled();
    expect(widget.state).toBe('unavailable');
  });
});

describe('turnstile', () => {
  it('obtains a fresh token before the POST and sends it', async () => {
    const mic = fakeMicrophone();
    const client = stubClient({ status: 200, body: SESSION_BODY });
    const transport = fakeTransport();
    const ts = fakeTurnstile();

    const { widget } = build(enabledConfig(), {
      requestMicrophone: async () => mic.stream,
      createClient: client.create,
      createTransport: transport.factory,
      createTurnstile: ts.factory,
    });

    await widget.start();
    await flush();

    expect(ts.getToken).toHaveBeenCalledTimes(1);
    const body = JSON.parse(client.fetchImpl.mock.calls[0]![1]!.body as string);
    expect(body.turnstile_token).toBe('ts-token-1');
  });

  it('discards the token after a successful request', async () => {
    const mic = fakeMicrophone();
    const client = stubClient({ status: 200, body: SESSION_BODY });
    const transport = fakeTransport();
    const ts = fakeTurnstile();

    const { widget } = build(enabledConfig(), {
      requestMicrophone: async () => mic.stream,
      createClient: client.create,
      createTransport: transport.factory,
      createTurnstile: ts.factory,
    });

    await widget.start();
    await flush();
    expect(ts.reset).toHaveBeenCalled();
  });

  it('discards the token after a FAILED request too', async () => {
    const mic = fakeMicrophone();
    const client = stubClient({ status: 500, body: { error: 'server_error' } });
    const ts = fakeTurnstile();

    const { widget } = build(enabledConfig(), {
      requestMicrophone: async () => mic.stream,
      createClient: client.create,
      createTurnstile: ts.factory,
    });

    await widget.start();
    await flush();

    expect(widget.state).toBe('error');
    expect(ts.reset).toHaveBeenCalled();
  });

  it('uses a different token on a retry — never replays the first', async () => {
    const mic = fakeMicrophone();
    const client = stubClient({ status: 200, body: SESSION_BODY });
    const transport = fakeTransport();
    const ts = fakeTurnstile();

    const { widget } = build(enabledConfig(), {
      requestMicrophone: async () => mic.stream,
      createClient: client.create,
      createTransport: transport.factory,
      createTurnstile: ts.factory,
    });

    await widget.start();
    await flush();
    await widget.disconnect('user_disconnected');
    await widget.start();
    await flush();

    const first = JSON.parse(client.fetchImpl.mock.calls[0]![1]!.body as string);
    const second = JSON.parse(client.fetchImpl.mock.calls[1]![1]!.body as string);
    expect(first.turnstile_token).toBe('ts-token-1');
    expect(second.turnstile_token).toBe('ts-token-2');
    expect(second.turnstile_token).not.toBe(first.turnstile_token);
  });

  it('fails closed when the challenge cannot be solved, and posts nothing', async () => {
    const mic = fakeMicrophone();
    const client = stubClient({ status: 200, body: SESSION_BODY });
    const ts = fakeTurnstile();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    // A JWT-shaped string in the cause proves the logger still redacts.
    ts.getToken.mockRejectedValue(
      new Error('challenge failed for eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.sig'),
    );

    const { widget } = build(enabledConfig(), {
      requestMicrophone: async () => mic.stream,
      createClient: client.create,
      createTurnstile: ts.factory,
    });

    await widget.start();
    await flush();

    expect(client.fetchImpl).not.toHaveBeenCalled();
    expect(widget.state).toBe('error');
    expect(widget.snapshot.errorCode).toBe('verification_failed');
    expect(mic.track.stop).toHaveBeenCalled();

    const warned = JSON.stringify(warn.mock.calls);
    expect(warned).toContain('[redacted]');
    expect(warned).not.toContain('eyJhbGciOiJIUzI1NiJ9');
  });

  it('creates no provider at all until a session is started', () => {
    const ts = fakeTurnstile();
    build(enabledConfig(), { createTurnstile: ts.factory });

    // Merely rendering the widget must not touch Cloudflare.
    expect(ts.getToken).not.toHaveBeenCalled();
  });

  it('destroys the provider when the widget is destroyed', async () => {
    const mic = fakeMicrophone();
    const client = stubClient({ status: 200, body: SESSION_BODY });
    const transport = fakeTransport();
    const ts = fakeTurnstile();

    const { widget } = build(enabledConfig(), {
      requestMicrophone: async () => mic.stream,
      createClient: client.create,
      createTransport: transport.factory,
      createTurnstile: ts.factory,
    });

    await widget.start();
    await flush();
    expect(ts.getToken).toHaveBeenCalled();

    widget.destroy();
    expect(ts.destroy).toHaveBeenCalled();
  });
});

describe('no automatic microphone activation', () => {
  it('does not request the microphone on construction', () => {
    const mic = vi.fn();
    build(enabledConfig(), { requestMicrophone: mic as unknown as () => Promise<MediaStream> });
    expect(mic).not.toHaveBeenCalled();
  });

  it('requests it only after the primary control is used', async () => {
    const mic = fakeMicrophone();
    const request = vi.fn(async () => mic.stream);
    const client = stubClient({ status: 200, body: SESSION_BODY });
    const transport = fakeTransport();

    const { mount } = build(enabledConfig(), {
      requestMicrophone: request,
      createClient: client.create,
      createTransport: transport.factory,
    });

    expect(request).not.toHaveBeenCalled();
    mount.querySelector<HTMLButtonElement>('.preview-orb__call')!.click();
    await flush();
    expect(request).toHaveBeenCalledTimes(1);
  });
});

describe('happy path', () => {
  it('reaches listening and shows a disconnect control', async () => {
    const mic = fakeMicrophone();
    const client = stubClient({ status: 200, body: SESSION_BODY });
    const transport = fakeTransport();

    const { widget, mount } = build(enabledConfig(), {
      requestMicrophone: async () => mic.stream,
      createClient: client.create,
      createTransport: transport.factory,
    });

    await widget.start();
    await flush();

    expect(widget.state).toBe('listening');
    expect(transport.connect).toHaveBeenCalledTimes(1);
    expect(mount.querySelector<HTMLElement>('.svd__disconnect')!.hidden).toBe(false);
  });

  it('passes the already-approved microphone to the transport', async () => {
    const mic = fakeMicrophone();
    const client = stubClient({ status: 200, body: SESSION_BODY });
    const transport = fakeTransport();

    const { widget } = build(enabledConfig(), {
      requestMicrophone: async () => mic.stream,
      createClient: client.create,
      createTransport: transport.factory,
    });

    await widget.start();
    await flush();

    expect(transport.connect.mock.calls[0]![0].microphone).toBe(mic.stream);
    expect(transport.connect.mock.calls[0]![0].token).toBe('jwt');
  });

  it('splits listening / thinking / speaking from the remote agent state', async () => {
    const mic = fakeMicrophone();
    const client = stubClient({ status: 200, body: SESSION_BODY });
    const transport = fakeTransport();

    const { widget } = build(enabledConfig(), {
      requestMicrophone: async () => mic.stream,
      createClient: client.create,
      createTransport: transport.factory,
    });

    await widget.start();
    await flush();

    transport.events.onAgentState('listening');
    expect(widget.state).toBe('listening');
    transport.events.onAgentState('thinking');
    expect(widget.state).toBe('assistantThinking');
    transport.events.onAgentState('speaking');
    expect(widget.state).toBe('assistantSpeaking');
    transport.events.onAgentState('listening');
    expect(widget.state).toBe('listening');
  });

  it('enters reconnecting and recovers', async () => {
    const mic = fakeMicrophone();
    const client = stubClient({ status: 200, body: SESSION_BODY });
    const transport = fakeTransport();

    const { widget } = build(enabledConfig(), {
      requestMicrophone: async () => mic.stream,
      createClient: client.create,
      createTransport: transport.factory,
    });

    await widget.start();
    await flush();

    transport.events.onReconnecting();
    expect(widget.state).toBe('reconnecting');
    transport.events.onReconnected();
    expect(widget.state).toBe('listening');
  });
});

describe('microphone denial', () => {
  it('shows a dedicated message and re-enable instructions', async () => {
    const denial = Object.assign(new Error('denied'), { name: 'NotAllowedError' });
    const { widget, mount } = build(enabledConfig(), {
      requestMicrophone: async () => {
        throw denial;
      },
    });

    await widget.start();
    await flush();

    expect(widget.state).toBe('error');
    expect(widget.snapshot.errorCode).toBe('microphone_denied');
    const hint = mount.querySelector<HTMLElement>('.svd__hint')!;
    expect(hint.hidden).toBe(false);
    expect(hint.textContent).toMatch(/padlock/i);
  });

  it('never contacts the endpoint when the microphone is refused', async () => {
    const client = stubClient({ status: 200, body: SESSION_BODY });
    const { widget } = build(enabledConfig(), {
      requestMicrophone: async () => {
        throw Object.assign(new Error('denied'), { name: 'NotAllowedError' });
      },
      createClient: client.create,
    });

    await widget.start();
    await flush();

    expect(client.fetchImpl).not.toHaveBeenCalled();
  });

  it('distinguishes a missing device from a refusal', async () => {
    const { widget } = build(enabledConfig(), {
      requestMicrophone: async () => {
        throw Object.assign(new Error('none'), { name: 'NotFoundError' });
      },
    });

    await widget.start();
    await flush();
    expect(widget.snapshot.errorCode).toBe('microphone_unavailable');
  });

  it('can be retried after a denial', async () => {
    const mic = fakeMicrophone();
    let firstCall = true;
    const client = stubClient({ status: 200, body: SESSION_BODY });
    const transport = fakeTransport();

    const { widget } = build(enabledConfig(), {
      requestMicrophone: async () => {
        if (firstCall) {
          firstCall = false;
          throw Object.assign(new Error('denied'), { name: 'NotAllowedError' });
        }
        return mic.stream;
      },
      createClient: client.create,
      createTransport: transport.factory,
    });

    await widget.start();
    await flush();
    expect(widget.state).toBe('error');

    await widget.start();
    await flush();
    expect(widget.state).toBe('listening');
  });
});

describe('duplicate sessions', () => {
  it('a second start while connecting neither re-prompts nor re-requests', async () => {
    const mic = fakeMicrophone();
    const request = vi.fn(async () => mic.stream);
    const client = stubClient({ status: 200, body: SESSION_BODY });
    const transport = fakeTransport();

    const { widget } = build(enabledConfig(), {
      requestMicrophone: request,
      createClient: client.create,
      createTransport: transport.factory,
    });

    await Promise.all([widget.start(), widget.start(), widget.start()]);
    await flush();

    expect(request).toHaveBeenCalledTimes(1);
    expect(client.fetchImpl).toHaveBeenCalledTimes(1);
    expect(transport.connect).toHaveBeenCalledTimes(1);
    expect(widget.state).toBe('listening');
  });

  it('rapid clicks on the orb produce exactly one session', async () => {
    const mic = fakeMicrophone();
    const request = vi.fn(async () => mic.stream);
    const client = stubClient({ status: 200, body: SESSION_BODY });
    const transport = fakeTransport();

    const { mount } = build(enabledConfig(), {
      requestMicrophone: request,
      createClient: client.create,
      createTransport: transport.factory,
    });

    const button = mount.querySelector<HTMLButtonElement>('.preview-orb__call')!;
    button.click();
    button.click();
    button.click();
    await flush(10);

    expect(request).toHaveBeenCalledTimes(1);
    expect(transport.connect).toHaveBeenCalledTimes(1);
  });
});

describe('disconnect and cleanup', () => {
  it('the disconnect button ends the session and stops the microphone', async () => {
    const mic = fakeMicrophone();
    const client = stubClient({ status: 200, body: SESSION_BODY });
    const transport = fakeTransport();

    const { widget, mount } = build(enabledConfig(), {
      requestMicrophone: async () => mic.stream,
      createClient: client.create,
      createTransport: transport.factory,
    });

    await widget.start();
    await flush();

    mount.querySelector<HTMLButtonElement>('.svd__disconnect')!.click();
    await flush();

    expect(widget.state).toBe('finished');
    expect(mic.track.stop).toHaveBeenCalled();
    expect(transport.disconnect).toHaveBeenCalled();
  });

  it('pagehide tears the session down', async () => {
    const mic = fakeMicrophone();
    const client = stubClient({ status: 200, body: SESSION_BODY });
    const transport = fakeTransport();

    const { widget } = build(enabledConfig(), {
      requestMicrophone: async () => mic.stream,
      createClient: client.create,
      createTransport: transport.factory,
    });

    await widget.start();
    await flush();

    window.dispatchEvent(new Event('pagehide'));
    await flush();

    expect(widget.state).toBe('finished');
    expect(transport.disconnect).toHaveBeenCalled();
    expect(mic.track.stop).toHaveBeenCalled();
  });

  it('destroy() releases everything and removes the DOM', async () => {
    const mic = fakeMicrophone();
    const client = stubClient({ status: 200, body: SESSION_BODY });
    const transport = fakeTransport();

    const { widget, mount } = build(enabledConfig(), {
      requestMicrophone: async () => mic.stream,
      createClient: client.create,
      createTransport: transport.factory,
    });

    await widget.start();
    await flush();
    widget.destroy();
    await flush();

    expect(mic.track.stop).toHaveBeenCalled();
    expect(transport.disconnect).toHaveBeenCalled();
    expect(mount.querySelector('.svd')).toBeNull();
  });

  it('destroy() is idempotent', async () => {
    const { widget } = build(enabledConfig());
    widget.destroy();
    expect(() => widget.destroy()).not.toThrow();
  });

  it('a transport-side disconnect finishes the session', async () => {
    const mic = fakeMicrophone();
    const client = stubClient({ status: 200, body: SESSION_BODY });
    const transport = fakeTransport();

    const { widget } = build(enabledConfig(), {
      requestMicrophone: async () => mic.stream,
      createClient: client.create,
      createTransport: transport.factory,
    });

    await widget.start();
    await flush();
    transport.events.onDisconnected();
    await flush();

    expect(widget.state).toBe('finished');
    expect(mic.track.stop).toHaveBeenCalled();
  });
});

describe('rate limiting', () => {
  it('shows the per-visitor message for rate_limited', async () => {
    const mic = fakeMicrophone();
    const client = stubClient({ status: 429, body: { error: 'rate_limited' } });

    const { widget, mount } = build(enabledConfig(), {
      requestMicrophone: async () => mic.stream,
      createClient: client.create,
    });

    await widget.start();
    await flush();

    expect(widget.state).toBe('rateLimited');
    expect(widget.snapshot.rateLimitScope).toBe('per_visitor');
    expect(mount.querySelector('.svd__headline')!.textContent).toMatch(/few goes/i);
    expect(mic.track.stop).toHaveBeenCalled();
  });

  it('frames a global capacity ceiling as popularity, not an apology', async () => {
    const mic = fakeMicrophone();
    const client = stubClient({ status: 429, body: { error: 'demo_capacity_reached' } });

    const { widget, mount } = build(enabledConfig(), {
      requestMicrophone: async () => mic.stream,
      createClient: client.create,
    });

    await widget.start();
    await flush();

    expect(widget.snapshot.rateLimitScope).toBe('global_capacity');
    const headline = mount.querySelector('.svd__headline')!.textContent ?? '';
    expect(headline).toMatch(/everyone wants/i);
    expect(headline).not.toMatch(/sorry|error|failed/i);
  });

  it('offers the signup CTA from the rate-limited state', async () => {
    const mic = fakeMicrophone();
    const client = stubClient({ status: 429, body: { error: 'demo_capacity_reached' } });

    const { widget, mount } = build(enabledConfig(), {
      requestMicrophone: async () => mic.stream,
      createClient: client.create,
    });

    await widget.start();
    await flush();

    expect(mount.querySelector<HTMLElement>('.svd__cta')!.hidden).toBe(false);
  });
});

describe('turnstile action reaches the endpoint (regression)', () => {
  /**
   * Drives the REAL provider — only the Cloudflare script is stubbed — through
   * a real client, so this covers the whole path rather than a mock of it:
   *
   *   render(action) -> execute -> token -> POST body.turnstile_token
   *
   * A mocked provider would have proved neither half.
   */
  function fakeTurnstileApi(token: string) {
    let callback: ((value: string) => void) | null = null;
    const api = {
      render: vi.fn((_el: HTMLElement, opts: Record<string, unknown>) => {
        callback = opts['callback'] as (value: string) => void;
        return 'widget-1';
      }),
      execute: vi.fn(() => queueMicrotask(() => callback?.(token))),
      reset: vi.fn(),
      remove: vi.fn(),
    };
    return api;
  }

  it('renders with action "public_voice_demo" and sends that token', async () => {
    const mic = fakeMicrophone();
    const client = stubClient({ status: 200, body: SESSION_BODY });
    const transport = fakeTransport();
    const api = fakeTurnstileApi('token-from-cloudflare');

    const { widget } = build(enabledConfig({ turnstileSiteKey: 'the-site-key' }), {
      requestMicrophone: async () => mic.stream,
      createClient: client.create,
      createTransport: transport.factory,
      createTurnstile: (config) =>
        createTurnstileProvider({
          siteKey: config.turnstileSiteKey,
          loadScript: async () => api as never,
        }),
    });

    await widget.start();
    await flush(12);

    // 1. Rendered with the exact action the backend will verify against.
    expect(api.render).toHaveBeenCalledTimes(1);
    const renderOptions = api.render.mock.calls[0]![1]!;
    expect(renderOptions['action']).toBe('public_voice_demo');
    expect(renderOptions['sitekey']).toBe('the-site-key');

    // 2. The token that challenge produced is what went to the endpoint.
    expect(client.fetchImpl).toHaveBeenCalledTimes(1);
    const body = JSON.parse(client.fetchImpl.mock.calls[0]![1]!.body as string);
    expect(body.turnstile_token).toBe('token-from-cloudflare');

    // And the session actually proceeded on the back of it.
    expect(widget.state).toBe('listening');
  });

  it('still sends the action-bearing token on a second session', async () => {
    const mic = fakeMicrophone();
    const client = stubClient({ status: 200, body: SESSION_BODY });
    const transport = fakeTransport();
    const api = fakeTurnstileApi('token-from-cloudflare');

    const { widget } = build(enabledConfig(), {
      requestMicrophone: async () => mic.stream,
      createClient: client.create,
      createTransport: transport.factory,
      createTurnstile: (config) =>
        createTurnstileProvider({
          siteKey: config.turnstileSiteKey,
          loadScript: async () => api as never,
        }),
    });

    await widget.start();
    await flush(12);
    await widget.disconnect('user_disconnected');
    await widget.start();
    await flush(12);

    expect(api.render).toHaveBeenCalledTimes(1);
    expect(api.render.mock.calls[0]![1]!['action']).toBe('public_voice_demo');

    const second = JSON.parse(client.fetchImpl.mock.calls[1]![1]!.body as string);
    expect(second.turnstile_token).toBe('token-from-cloudflare');
  });
});

describe('transport failure diagnostics', () => {
  async function failAt(phase: 'module_load' | 'room_connect' | 'microphone_publish') {
    const mic = fakeMicrophone();
    const client = stubClient({ status: 200, body: SESSION_BODY });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { widget } = build(enabledConfig(), {
      requestMicrophone: async () => mic.stream,
      createClient: client.create,
      createTransport: () => ({
        connect: async () => {
          throw new TransportError(phase, Object.assign(new Error('boom'), { name: 'PublishError' }));
        },
        disconnect: async () => undefined,
      }),
    });

    await widget.start();
    await flush();
    return { widget, errorSpy, mic };
  }

  it('records which leg failed', async () => {
    for (const phase of ['module_load', 'room_connect', 'microphone_publish'] as const) {
      const { widget } = await failAt(phase);
      expect(widget.state).toBe('error');
      expect(widget.transportPhase, phase).toBe(phase);
    }
  });

  it('logs the phase without the token or endpoint', async () => {
    const { errorSpy } = await failAt('microphone_publish');
    const logged = JSON.stringify(errorSpy.mock.calls);

    expect(logged).toContain('microphone_publish');
    expect(logged).not.toContain('jwt');
    expect(logged).not.toContain('stub.supabase.co');
    expect(logged).not.toContain('anon-key');
  });

  it('still releases the microphone when publication fails', async () => {
    const { mic } = await failAt('microphone_publish');
    expect(mic.track.stop).toHaveBeenCalled();
  });

  it('does not carry a stale phase into a later successful attempt', async () => {
    const mic = fakeMicrophone();
    const client = stubClient({ status: 200, body: SESSION_BODY });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    let failFirst = true;
    const { widget } = build(enabledConfig(), {
      requestMicrophone: async () => mic.stream,
      createClient: client.create,
      createTransport: (bus) => ({
        connect: async () => {
          if (failFirst) {
            failFirst = false;
            throw new TransportError('room_connect');
          }
          bus.onConnected();
          bus.onAgentState('listening');
        },
        disconnect: async () => undefined,
      }),
    });

    await widget.start();
    await flush();
    expect(widget.transportPhase).toBe('room_connect');

    await widget.start();
    await flush();
    expect(widget.state).toBe('listening');
    expect(widget.transportPhase).toBeNull();
  });
});

describe('Retry-After is honoured', () => {
  it('blocks a second attempt inside the window, without touching the mic', async () => {
    let clock = 1_000_000;
    const mic = fakeMicrophone();
    const request = vi.fn(async () => mic.stream);
    const client = stubClient({
      status: 429,
      body: { error: 'rate_limited' },
      headers: { 'retry-after': '60' },
    });

    const { widget } = build(enabledConfig(), {
      requestMicrophone: request,
      createClient: client.create,
      now: () => clock,
    });

    await widget.start();
    await flush();
    expect(widget.state).toBe('rateLimited');
    expect(request).toHaveBeenCalledTimes(1);

    clock += 30_000; // still inside the window
    await widget.start();
    await flush();

    expect(request).toHaveBeenCalledTimes(1);
    expect(client.fetchImpl).toHaveBeenCalledTimes(1);
    expect(widget.state).toBe('rateLimited');
  });

  it('allows a retry once the window has elapsed', async () => {
    let clock = 1_000_000;
    const mic = fakeMicrophone();
    const transport = fakeTransport();
    const client = stubClient(
      { status: 429, body: { error: 'rate_limited' }, headers: { 'retry-after': '60' } },
      { status: 200, body: SESSION_BODY },
    );

    const { widget } = build(enabledConfig(), {
      requestMicrophone: async () => mic.stream,
      createClient: client.create,
      createTransport: transport.factory,
      now: () => clock,
    });

    await widget.start();
    await flush();
    expect(widget.state).toBe('rateLimited');

    clock += 61_000;
    await widget.start();
    await flush();

    expect(client.fetchImpl).toHaveBeenCalledTimes(2);
    expect(widget.state).toBe('listening');
  });

  it('does not block when the server sent no Retry-After', async () => {
    const mic = fakeMicrophone();
    const client = stubClient({ status: 429, body: { error: 'rate_limited' } });

    const { widget } = build(enabledConfig(), {
      requestMicrophone: async () => mic.stream,
      createClient: client.create,
    });

    await widget.start();
    await flush();
    await widget.start();
    await flush();

    expect(client.fetchImpl).toHaveBeenCalledTimes(2);
  });
});

describe('cancellation before connection', () => {
  it('pagehide during the microphone prompt stops the track that arrives late', async () => {
    const mic = fakeMicrophone();
    let releaseMic: (stream: MediaStream) => void = () => undefined;
    const pending = new Promise<MediaStream>((resolve) => {
      releaseMic = resolve;
    });
    const client = stubClient({ status: 200, body: SESSION_BODY });

    const { widget } = build(enabledConfig(), {
      requestMicrophone: () => pending,
      createClient: client.create,
    });

    const started = widget.start();
    await flush();
    expect(widget.state).toBe('requestingMicrophone');

    window.dispatchEvent(new Event('pagehide'));
    await flush();
    expect(widget.state).toBe('finished');

    // getUserMedia resolves after the page is gone.
    releaseMic(mic.stream);
    await started;
    await flush();

    expect(mic.track.stop).toHaveBeenCalled();
    expect(client.fetchImpl).not.toHaveBeenCalled();
  });

  it('pagehide while connecting aborts the request and stops the mic', async () => {
    const mic = fakeMicrophone();
    let resolveFetch: (value: Response) => void = () => undefined;
    const fetchImpl = vi.fn(
      () => new Promise<Response>((resolve) => { resolveFetch = resolve; }),
    );

    const { widget } = build(enabledConfig(), {
      requestMicrophone: async () => mic.stream,
      createClient: (config) =>
        new PublicVoiceDemoClient({
          baseUrl: config.endpointBaseUrl,
          anonKey: config.anonKey,
          path: config.endpointPath,
          requireTurnstileToken: true,
          fetchImpl: fetchImpl as unknown as typeof fetch,
        }),
    });

    const started = widget.start();
    await flush(8);
    expect(widget.state).toBe('connecting');

    window.dispatchEvent(new Event('pagehide'));
    await flush();
    expect(widget.state).toBe('finished');
    expect(mic.track.stop).toHaveBeenCalled();

    resolveFetch({
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => SESSION_BODY,
    } as unknown as Response);
    await started;
    await flush();

    expect(widget.state).toBe('finished');
  });

  it('a room that finishes joining after cancellation is disconnected', async () => {
    const mic = fakeMicrophone();
    const client = stubClient({ status: 200, body: SESSION_BODY });
    const disconnect = vi.fn(async () => undefined);
    let finishConnect: () => void = () => undefined;

    const { widget } = build(enabledConfig(), {
      requestMicrophone: async () => mic.stream,
      createClient: client.create,
      createTransport: () => ({
        connect: () => new Promise<void>((resolve) => { finishConnect = resolve; }),
        disconnect,
      }),
    });

    const started = widget.start();
    await flush(10);

    window.dispatchEvent(new Event('pagehide'));
    await flush();

    finishConnect();
    await started;
    await flush();

    expect(disconnect).toHaveBeenCalled();
    expect(widget.state).toBe('finished');
  });
});

describe('endpoint unavailable', () => {
  it('a disabled backend drops the widget to unavailable, not an error', async () => {
    const mic = fakeMicrophone();
    const client = stubClient({ status: 503, body: { error: 'demo_disabled' } });

    const { widget } = build(enabledConfig({ renderWhenUnavailable: true }), {
      requestMicrophone: async () => mic.stream,
      createClient: client.create,
    });

    await widget.start();
    await flush();

    expect(widget.state).toBe('unavailable');
    expect(mic.track.stop).toHaveBeenCalled();
  });

  it('a network failure is an error the visitor can retry', async () => {
    const mic = fakeMicrophone();
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });

    const { widget } = build(enabledConfig(), {
      requestMicrophone: async () => mic.stream,
      createClient: (config) =>
        new PublicVoiceDemoClient({
          baseUrl: config.endpointBaseUrl,
          anonKey: config.anonKey,
          path: config.endpointPath,
          requireTurnstileToken: config.turnstileSiteKey !== '',
          fetchImpl: fetchImpl as unknown as typeof fetch,
        }),
    });

    await widget.start();
    await flush();

    expect(widget.state).toBe('error');
    expect(widget.snapshot.errorCode).toBe('network_error');
  });

  it('a malformed response is reported as a contract violation, not a crash', async () => {
    const mic = fakeMicrophone();
    const client = stubClient({ status: 200, body: { token: 'only-a-token' } });

    const { widget } = build(enabledConfig(), {
      requestMicrophone: async () => mic.stream,
      createClient: client.create,
    });

    await widget.start();
    await flush();

    expect(widget.state).toBe('error');
    expect(widget.snapshot.errorCode).toBe('contract_violation');
  });
});

describe('recording consent', () => {
  const CONSENT_BODY = {
    error: 'consent_required',
    recording: {
      required: true,
      text: 'Server-authored notice: this call is recorded.',
      policy_version: 'rec-2026-02',
      locale: 'en',
      policy_url: 'https://www.seenn.ai/privacy-policy.html',
    },
  };

  it('renders the server’s wording verbatim and nothing of its own', async () => {
    const mic = fakeMicrophone();
    const client = stubClient({ status: 428, body: CONSENT_BODY });

    const { widget, mount } = build(enabledConfig(), {
      requestMicrophone: async () => mic.stream,
      createClient: client.create,
    });

    void widget.start();
    await flush(10);

    const panel = mount.querySelector<HTMLElement>('.svd__consent')!;
    expect(panel.hidden).toBe(false);
    expect(mount.querySelector('.svd__consent-text')!.textContent).toBe(
      'Server-authored notice: this call is recorded.',
    );
    expect(mount.querySelector<HTMLAnchorElement>('.svd__consent-link')!.href).toBe(
      'https://www.seenn.ai/privacy-policy.html',
    );
  });

  it('sends the policy version and locale back on acceptance', async () => {
    const mic = fakeMicrophone();
    const client = stubClient(
      { status: 428, body: CONSENT_BODY },
      { status: 200, body: SESSION_BODY },
    );
    const transport = fakeTransport();

    const { widget, mount } = build(enabledConfig(), {
      requestMicrophone: async () => mic.stream,
      createClient: client.create,
      createTransport: transport.factory,
    });

    void widget.start();
    await flush(10);

    mount.querySelector<HTMLButtonElement>('.svd__consent-accept')!.click();
    await flush(12);

    const secondBody = JSON.parse(client.fetchImpl.mock.calls[1]![1]!.body as string);
    expect(secondBody.consent).toMatchObject({
      policy_version: 'rec-2026-02',
      locale: 'en',
    });
    expect(secondBody.consent.accepted_at).toBeTruthy();
    expect(widget.state).toBe('listening');
  });

  it('declining ends the session without connecting or recording', async () => {
    const mic = fakeMicrophone();
    const client = stubClient({ status: 428, body: CONSENT_BODY });
    const transport = fakeTransport();

    const { widget, mount } = build(enabledConfig(), {
      requestMicrophone: async () => mic.stream,
      createClient: client.create,
      createTransport: transport.factory,
    });

    void widget.start();
    await flush(10);

    mount.querySelector<HTMLButtonElement>('.svd__consent-decline')!.click();
    await flush(10);

    expect(widget.state).toBe('finished');
    expect(transport.connect).not.toHaveBeenCalled();
    expect(mic.track.stop).toHaveBeenCalled();
  });

  it('refuses a token that arrives with recording.required — v1 is not recorded', async () => {
    const mic = fakeMicrophone();
    const client = stubClient({
      status: 200,
      body: {
        ...SESSION_BODY,
        recording: { required: true, text: 'Recorded.', policy_version: 'rec-1', locale: 'en' },
      },
    });
    const transport = fakeTransport();

    const { widget } = build(enabledConfig(), {
      requestMicrophone: async () => mic.stream,
      createClient: client.create,
      createTransport: transport.factory,
    });

    await widget.start();
    await flush(10);

    expect(widget.state).toBe('error');
    expect(widget.snapshot.errorCode).toBe('contract_violation');
    expect(transport.connect).not.toHaveBeenCalled();
    expect(mic.track.stop).toHaveBeenCalled();
  });

  it('fails closed on a malformed required-recording block', async () => {
    const mic = fakeMicrophone();
    const client = stubClient({
      status: 200,
      body: { ...SESSION_BODY, recording: { required: true } },
    });
    const transport = fakeTransport();

    const { widget } = build(enabledConfig(), {
      requestMicrophone: async () => mic.stream,
      createClient: client.create,
      createTransport: transport.factory,
    });

    await widget.start();
    await flush(10);

    expect(widget.state).toBe('error');
    expect(widget.snapshot.errorCode).toBe('contract_violation');
    expect(transport.connect).not.toHaveBeenCalled();
  });

  it('matches a stored acceptance on locale as well as version', async () => {
    const mic = fakeMicrophone();
    // Same policy version, different locale: must be asked again.
    const client = stubClient(
      {
        status: 428,
        body: {
          error: 'consent_required',
          recording: { required: true, text: 'HE notice', policy_version: 'rec-1', locale: 'he' },
        },
      },
      { status: 200, body: SESSION_BODY },
    );
    const transport = fakeTransport();

    const { widget, mount } = build(enabledConfig(), {
      requestMicrophone: async () => mic.stream,
      createClient: client.create,
      createTransport: transport.factory,
    });

    void widget.start();
    await flush(10);
    mount.querySelector<HTMLButtonElement>('.svd__consent-accept')!.click();
    await flush(12);

    expect(widget.snapshot.acceptedConsent).toEqual(
      expect.objectContaining({ policyVersion: 'rec-1', locale: 'he' }),
    );
  });
});

describe('locale and direction', () => {
  it('renders Hebrew RTL from the page language', () => {
    document.documentElement.setAttribute('lang', 'he');
    const { mount } = build(enabledConfig());
    const root = mount.querySelector('.svd')!;

    expect(root.getAttribute('dir')).toBe('rtl');
    expect(root.getAttribute('lang')).toBe('he');
    expect(mount.querySelector('.svd__headline')!.textContent).toMatch(/דברו/);
  });

  it('renders Arabic RTL', () => {
    document.documentElement.setAttribute('lang', 'ar');
    const { mount } = build(enabledConfig());
    const root = mount.querySelector('.svd')!;

    expect(root.getAttribute('dir')).toBe('rtl');
    expect(root.getAttribute('lang')).toBe('ar');
    expect(mount.querySelector('.svd__headline')!.textContent).toMatch(/تحدّث/);
  });

  it('renders English LTR', () => {
    document.documentElement.setAttribute('lang', 'en');
    const { mount } = build(enabledConfig());
    expect(mount.querySelector('.svd')!.getAttribute('dir')).toBe('ltr');
  });

  it('keeps its own direction when embedded in a page of the other direction', () => {
    document.documentElement.setAttribute('lang', 'en');
    const { mount } = build(enabledConfig({ locale: 'ar' }));
    expect(mount.querySelector('.svd')!.getAttribute('dir')).toBe('rtl');
  });

  it('follows a live language switch', () => {
    document.documentElement.setAttribute('lang', 'en');
    const { widget, mount } = build(enabledConfig());
    expect(mount.querySelector('.svd')!.getAttribute('dir')).toBe('ltr');

    widget.setLocale('he');
    expect(mount.querySelector('.svd')!.getAttribute('dir')).toBe('rtl');
    expect(mount.querySelector('.svd__headline')!.textContent).toMatch(/דברו/);
  });

  it('sends the resolved locale to the endpoint', async () => {
    document.documentElement.setAttribute('lang', 'ar');
    const mic = fakeMicrophone();
    const client = stubClient({ status: 200, body: SESSION_BODY });
    const transport = fakeTransport();

    const { widget } = build(enabledConfig(), {
      requestMicrophone: async () => mic.stream,
      createClient: client.create,
      createTransport: transport.factory,
    });

    await widget.start();
    await flush();

    const body = JSON.parse(client.fetchImpl.mock.calls[0]![1]!.body as string);
    expect(body.language).toBe('ar');
  });
});

describe('credential hygiene', () => {
  it('never writes the participant token into the DOM', async () => {
    const mic = fakeMicrophone();
    const client = stubClient({ status: 200, body: SESSION_BODY });
    const transport = fakeTransport();

    const { widget, mount } = build(enabledConfig(), {
      requestMicrophone: async () => mic.stream,
      createClient: client.create,
      createTransport: transport.factory,
    });

    await widget.start();
    await flush();

    expect(mount.innerHTML).not.toContain('jwt');
    expect(mount.innerHTML).not.toContain('anon-key');
  });

  it('does not log the token when the transport fails', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const mic = fakeMicrophone();
    const client = stubClient({ status: 200, body: SESSION_BODY });

    const { widget } = build(enabledConfig(), {
      requestMicrophone: async () => mic.stream,
      createClient: client.create,
      createTransport: () => ({
        connect: async () => {
          throw new Error('connect blew up with token=jwt');
        },
        disconnect: async () => undefined,
      }),
    });

    await widget.start();
    await flush();

    expect(widget.state).toBe('error');
    const logged = JSON.stringify(error.mock.calls);
    // Stronger than redaction: the underlying message is never logged, so the
    // token cannot appear even unredacted.
    expect(logged).not.toContain('token=jwt');
    expect(logged).not.toContain('jwt');
    expect(logged).toContain('transport failed');
  });
});
