/**
 * The bug: the widget showed "She is listening" the moment the BROWSER joined
 * the room and published its microphone. In the failed staging call only the
 * browser ever joined — the voice agent never became ready — and the page
 * still claimed the secretary was listening.
 *
 * Readiness is a property of the REMOTE agent, not of our own publication.
 *
 * The vocabulary asserted here is not invented. It is the documented
 * `lk.agent.state` participant attribute, and the values are the ones listed
 * in LiveKit's agent-state documentation. `participant.isAgent` exists in the
 * pinned livekit-client 2.21.0 (dist/src/room/participant/Participant.d.ts).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VoiceDemoWidget } from '../src/widget';
import { DEFAULT_CONFIG } from '../src/config';
import { PublicVoiceDemoClient } from '../src/client';
import type { VoiceDemoConfig } from '../src/config';
import type { WidgetDeps } from '../src/widget';
import type { TransportEvents, VoiceTransport } from '../src/transport';

const SESSION_ID = 'demo-session-abc123';

const SESSION_BODY = {
  token: 'jwt',
  livekit_url: 'wss://x.livekit.cloud',
  session_id: SESSION_ID,
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
    // Not the subject of these suites: an empty URL disables the same-origin
    // language lookup, so the request stays automatic and no global fetch is
    // needed. The lookup has its own coverage in language-automatic.test.ts.
    languageLookupUrl: '',
    ...overrides,
  };
}

function fakeMicrophone() {
  const track = { stop: vi.fn(), kind: 'audio' };
  const stream = { getTracks: () => [track], getAudioTracks: () => [track] };
  return { stream: stream as unknown as MediaStream, track };
}

function fakeTurnstile() {
  return {
    factory: () => ({
      getToken: vi.fn(async () => 'ts-token'),
      reset: vi.fn(),
      destroy: vi.fn(),
    }),
  };
}

function stubClient() {
  const fetchImpl = vi.fn(async (_url: string, _init: RequestInit) => ({
    ok: true,
    status: 200,
    headers: { get: () => null },
    json: async () => SESSION_BODY,
  } as unknown as Response));

  return {
    fetchImpl,
    create: (config: VoiceDemoConfig) =>
      new PublicVoiceDemoClient({
        baseUrl: config.endpointBaseUrl,
        anonKey: config.anonKey,
        path: config.endpointPath,
        requireTurnstileToken: true,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
  };
}

/**
 * A transport that connects successfully — room joined, microphone published —
 * and hands back the event bus so a test can drive the remote agent by hand.
 */
function agentDrivenTransport() {
  let events: TransportEvents | null = null;
  // Mirrors the real transport: the room is joined and the microphone is
  // published, and that is announced. Crucially it says nothing about an
  // agent — which is exactly the failed staging call.
  const connect = vi.fn(async () => {
    events?.onConnected();
  });
  const disconnect = vi.fn(async () => undefined);

  return {
    connect,
    disconnect,
    factory: (bus: TransportEvents): VoiceTransport => {
      events = bus;
      return { connect, disconnect };
    },
    get bus(): TransportEvents {
      if (!events) throw new Error('transport was never created');
      return events;
    },
  };
}

const flush = async (times = 10): Promise<void> => {
  for (let i = 0; i < times; i += 1) await Promise.resolve();
};

function build(config: VoiceDemoConfig, deps: WidgetDeps = {}) {
  const mount = document.createElement('div');
  mount.setAttribute('data-seenn-voice-demo', '');
  document.body.appendChild(mount);
  const withTurnstile: WidgetDeps = { createTurnstile: fakeTurnstile().factory, ...deps };
  return { widget: new VoiceDemoWidget(mount, config, withTurnstile), mount };
}

/** Connects the browser to the room. Nothing about the agent yet. */
async function connectedWidget(extra: Partial<WidgetDeps> = {}) {
  const mic = fakeMicrophone();
  const client = stubClient();
  const transport = agentDrivenTransport();

  const built = build(enabledConfig(), {
    requestMicrophone: async () => mic.stream,
    createClient: client.create,
    createTransport: transport.factory,
    ...extra,
  });

  await built.widget.start();
  await flush();
  return { ...built, mic, client, transport };
}

beforeEach(() => {
  document.body.innerHTML = '';
  document.documentElement.setAttribute('lang', 'en');
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn() },
  });
});

describe('local publication is not readiness', () => {
  it('room connected + microphone published, no agent => NOT listening', async () => {
    const { widget, mount } = await connectedWidget();

    expect(widget.transportConnected).toBe(true);
    expect(widget.state).not.toBe('listening');
    expect(widget.state).toBe('connecting');
    expect(mount.querySelector('.svd__headline')!.textContent).not.toMatch(/listening/i);
  });

  it('shows "Connecting you to the secretary" while the agent is absent', async () => {
    const { mount } = await connectedWidget();
    expect(mount.querySelector('.svd__headline')!.textContent).toMatch(
      /connecting you to the secretary/i,
    );
  });

  it('an agent that is initializing is still not listening', async () => {
    const { widget, transport } = await connectedWidget();

    transport.bus.onAgentState('initializing');
    await flush();

    expect(widget.state).toBe('connecting');
  });

  it('every documented pending state keeps the widget in connecting', async () => {
    for (const pending of ['connecting', 'pre-connect-buffering', 'initializing', 'idle']) {
      const { widget, transport } = await connectedWidget();
      transport.bus.onAgentState(pending);
      await flush();
      expect(widget.state, pending).toBe('connecting');
    }
  });

  it('an undocumented state fails closed rather than showing listening', async () => {
    const { widget, transport } = await connectedWidget();

    transport.bus.onAgentState('some_future_state');
    await flush();

    expect(widget.state).toBe('connecting');
  });
});

describe('only a ready remote agent unlocks listening', () => {
  it('agent listening => listening', async () => {
    const { widget, mount, transport } = await connectedWidget();

    transport.bus.onAgentState('listening');
    await flush();

    expect(widget.state).toBe('listening');
    expect(mount.querySelector('.svd__headline')!.textContent).toMatch(/listening/i);
  });

  it('agent thinking => thinking UI', async () => {
    const { widget, transport } = await connectedWidget();

    transport.bus.onAgentState('listening');
    transport.bus.onAgentState('thinking');
    await flush();

    expect(widget.state).toBe('assistantThinking');
  });

  it('agent speaking => speaking UI', async () => {
    const { widget, transport } = await connectedWidget();

    transport.bus.onAgentState('listening');
    transport.bus.onAgentState('speaking');
    await flush();

    expect(widget.state).toBe('assistantSpeaking');
  });

  it('cycles listening -> thinking -> speaking -> listening', async () => {
    const { widget, transport } = await connectedWidget();

    transport.bus.onAgentState('listening');
    expect(widget.state).toBe('listening');
    transport.bus.onAgentState('thinking');
    expect(widget.state).toBe('assistantThinking');
    transport.bus.onAgentState('speaking');
    expect(widget.state).toBe('assistantSpeaking');
    transport.bus.onAgentState('listening');
    expect(widget.state).toBe('listening');
  });
});

describe('agent failure, disconnect and no-show', () => {
  it('agent failed => error with full cleanup', async () => {
    const { widget, mic, transport } = await connectedWidget();

    transport.bus.onAgentState('failed');
    await flush();

    expect(widget.state).toBe('error');
    expect(mic.track.stop).toHaveBeenCalled();
    expect(transport.disconnect).toHaveBeenCalled();
  });

  it('agent disconnected after being ready => error with cleanup', async () => {
    const { widget, mic, transport } = await connectedWidget();

    transport.bus.onAgentState('listening');
    await flush();
    transport.bus.onAgentState('disconnected');
    await flush();

    expect(widget.state).toBe('error');
    expect(mic.track.stop).toHaveBeenCalled();
    expect(transport.disconnect).toHaveBeenCalled();
  });

  it('agent leaving the room entirely => error with cleanup', async () => {
    const { widget, mic, transport } = await connectedWidget();

    transport.bus.onAgentState('listening');
    await flush();
    transport.bus.onAgentState(null); // participant gone
    await flush();

    expect(widget.state).toBe('error');
    expect(mic.track.stop).toHaveBeenCalled();
  });

  it('agent never appears within 20s => error, cleanup, and no timer left', async () => {
    vi.useFakeTimers();
    try {
      const { widget, mic, transport } = await connectedWidget();
      expect(widget.state).toBe('connecting');

      await vi.advanceTimersByTimeAsync(19_000);
      expect(widget.state).toBe('connecting');

      await vi.advanceTimersByTimeAsync(2_000);
      await flush();

      expect(widget.state).toBe('error');
      expect(mic.track.stop).toHaveBeenCalled();
      expect(transport.disconnect).toHaveBeenCalled();
      expect(widget.snapshot.session).toBeNull();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('a ready agent cancels the no-show timeout', async () => {
    vi.useFakeTimers();
    try {
      const { widget, transport } = await connectedWidget();
      transport.bus.onAgentState('listening');

      await vi.advanceTimersByTimeAsync(30_000);
      await flush();

      // Still live: the deadline only ends it, and that is much later.
      expect(widget.state).not.toBe('error');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('support diagnostics', () => {
  it('shows a copyable Support ID carrying only the session id', async () => {
    const { widget, mount, transport } = await connectedWidget();

    transport.bus.onAgentState('failed');
    await flush();

    const support = mount.querySelector('.svd__support');
    expect(support).not.toBeNull();
    expect(support!.textContent).toContain(SESSION_ID);

    const value = mount.querySelector('.svd__support-id')!.textContent ?? '';
    // Only the session id — no token, url or key alongside it.
    expect(value.trim()).toBe(SESSION_ID);
    expect(value).not.toContain('jwt');
    expect(value).not.toContain('wss://');

    expect(mount.querySelector('.svd__support-copy')).not.toBeNull();
    expect(widget.supportId).toBe(SESSION_ID);
  });

  it('never renders the token, room url or credentials anywhere', async () => {
    const { mount, transport } = await connectedWidget();

    transport.bus.onAgentState('failed');
    await flush();

    const html = mount.innerHTML;
    expect(html).not.toContain('jwt');
    expect(html).not.toContain('wss://x.livekit.cloud');
    expect(html).not.toContain('anon-key');
    expect(html).not.toContain('ts-token');
  });

  it('reports session id and a safe phase to analytics', async () => {
    const gtag = vi.fn();
    (window as { gtag?: unknown }).gtag = gtag;

    const { transport } = await connectedWidget();
    transport.bus.onAgentState('failed');
    await flush();

    const errorEvent = gtag.mock.calls.find(
      (call) => call[0] === 'event' && call[1] === 'voice_demo_error',
    );
    expect(errorEvent).toBeDefined();
    const params = errorEvent![2] as Record<string, unknown>;
    expect(params['voice_demo_session']).toBe(SESSION_ID);
    expect(params['voice_demo_phase']).toBe('agent_readiness');

    // Nothing sensitive rides along.
    const serialised = JSON.stringify(params);
    expect(serialised).not.toContain('jwt');
    expect(serialised).not.toContain('wss://');

    delete (window as { gtag?: unknown }).gtag;
  });
});
