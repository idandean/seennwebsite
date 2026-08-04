/**
 * The recording-ready handshake.
 *
 * On the consented path the visitor's microphone must not reach the room until
 * the agent has said, in exactly these words, that it is recording. Every test
 * here is about a microphone that stayed unpublished: a near-miss — right
 * topic, wrong version; right payload, wrong sender — has to fail closed
 * rather than nearly work.
 */
import { describe, expect, it, vi } from 'vitest';
import {
  CAPTURE_MESSAGE_TYPE,
  CAPTURE_MESSAGE_VERSION,
  CAPTURE_TOPIC,
  TransportError,
  createLiveKitTransport,
  isCaptureReadyPayload,
} from '../src/transport';
import { AGENT_STATE_ATTRIBUTE } from '../src/agent';
import type { TransportEvents } from '../src/transport';

const RELIABLE = 0;
const LOSSY = 1;

function encode(value: unknown): Uint8Array {
  return new TextEncoder().encode(typeof value === 'string' ? value : JSON.stringify(value));
}

const AGENT = { identity: 'agent-1', isLocal: false, isAgent: true };
const VISITOR = { identity: 'someone-else', isLocal: false, isAgent: false };

/** A fake livekit module whose room records what was published and when. */
function fakeLiveKit() {
  const handlers = new Map<string, ((...args: unknown[]) => void)[]>();
  const published: unknown[] = [];
  const order: string[] = [];
  let connected = false;

  const room = {
    on(event: string, handler: (...args: unknown[]) => void) {
      order.push(`on:${event}`);
      const list = handlers.get(event) ?? [];
      list.push(handler);
      handlers.set(event, list);
    },
    async connect() {
      order.push('connect');
      connected = true;
    },
    async disconnect() {
      order.push('disconnect');
      connected = false;
    },
    startAudio: async () => undefined,
    localParticipant: {
      async publishTrack(track: unknown) {
        order.push('publishTrack');
        published.push(track);
        return undefined;
      },
      async setMicrophoneEnabled() {
        order.push('setMicrophoneEnabled');
        published.push('mic-enabled');
        return undefined;
      },
    },
    remoteParticipants: new Map(),
  };

  const module = {
    Room: function Room() {
      return room;
    } as unknown as new () => typeof room,
    RoomEvent: {
      DataReceived: 'dataReceived',
      Disconnected: 'disconnected',
      TrackSubscribed: 'trackSubscribed',
      ParticipantConnected: 'participantConnected',
      ParticipantDisconnected: 'participantDisconnected',
      ParticipantAttributesChanged: 'participantAttributesChanged',
      Reconnecting: 'reconnecting',
      Reconnected: 'reconnected',
    },
    Track: { Kind: { Audio: 'audio' }, Source: { Microphone: 'microphone' } },
    LocalAudioTrack: function LocalAudioTrack(t: MediaStreamTrack) {
      return { wrapped: t };
    } as unknown as new (t: MediaStreamTrack) => unknown,
    DataPacket_Kind: { RELIABLE, LOSSY },
  };

  const emit = (event: string, ...args: unknown[]): void => {
    (handlers.get(event) ?? []).forEach((h) => h(...args));
  };

  return { module, room, emit, published, order, isConnected: () => connected, handlers };
}

function events(): TransportEvents {
  return {
    onConnected: vi.fn(),
    onDisconnected: vi.fn(),
    onReconnecting: vi.fn(),
    onReconnected: vi.fn(),
    onAgentState: vi.fn(),
    onLevel: vi.fn(),
    onError: vi.fn(),
  };
}

function microphone() {
  const track = { stop: vi.fn(), kind: 'audio' } as unknown as MediaStreamTrack;
  return {
    stream: { getAudioTracks: () => [track], getTracks: () => [track] } as unknown as MediaStream,
    track,
  };
}

function connectOptions(mic: MediaStream, overrides: Record<string, unknown> = {}) {
  return {
    url: 'wss://x.livekit.cloud',
    token: 'jwt',
    microphone: mic,
    audioElement: document.createElement('audio'),
    requireCaptureMarker: true,
    captureTimeoutMs: 60,
    ...overrides,
  };
}

describe('the marker payload', () => {
  it('accepts exactly the agreed object', () => {
    expect(isCaptureReadyPayload({ type: CAPTURE_MESSAGE_TYPE, version: CAPTURE_MESSAGE_VERSION })).toBe(true);
  });

  it.each([
    ['an extra field', { type: CAPTURE_MESSAGE_TYPE, version: 1, extra: true }],
    ['a missing version', { type: CAPTURE_MESSAGE_TYPE }],
    ['a wrong version', { type: CAPTURE_MESSAGE_TYPE, version: 2 }],
    ['a string version', { type: CAPTURE_MESSAGE_TYPE, version: '1' }],
    ['a wrong type', { type: 'public_demo_ready', version: 1 }],
    ['an array', [{ type: CAPTURE_MESSAGE_TYPE, version: 1 }]],
    ['null', null],
    ['a bare string', 'public_demo_capture_ready'],
    ['a number', 1],
  ])('rejects %s', (_name, value) => {
    expect(isCaptureReadyPayload(value)).toBe(false);
  });

  it('uses the exact agreed constants', () => {
    expect(CAPTURE_TOPIC).toBe('seenn.public_demo.capture');
    expect(CAPTURE_MESSAGE_TYPE).toBe('public_demo_capture_ready');
    expect(CAPTURE_MESSAGE_VERSION).toBe(1);
  });
});

describe('ordering', () => {
  it('registers the data listener before connecting', async () => {
    const lk = fakeLiveKit();
    const mic = microphone();
    const transport = createLiveKitTransport(events(), {
      moduleUrl: 'stub',
      loadModule: async () => lk.module as never,
    });

    const pending = transport.connect(connectOptions(mic.stream));
    await vi.waitFor(() => expect(lk.order).toContain('connect'));

    const listenerAt = lk.order.indexOf('on:dataReceived');
    const connectAt = lk.order.indexOf('connect');
    expect(listenerAt).toBeGreaterThanOrEqual(0);
    expect(listenerAt).toBeLessThan(connectAt);

    lk.emit('dataReceived', encode({ type: CAPTURE_MESSAGE_TYPE, version: 1 }), AGENT, RELIABLE, CAPTURE_TOPIC);
    await pending;
  });

  it('publishes no microphone track before the marker', async () => {
    const lk = fakeLiveKit();
    const mic = microphone();
    const transport = createLiveKitTransport(events(), {
      moduleUrl: 'stub',
      loadModule: async () => lk.module as never,
    });

    const pending = transport.connect(connectOptions(mic.stream));
    await vi.waitFor(() => expect(lk.order).toContain('connect'));

    // Connected, and deliberately silent.
    expect(lk.published).toHaveLength(0);
    expect(lk.order).not.toContain('publishTrack');

    lk.emit('dataReceived', encode({ type: CAPTURE_MESSAGE_TYPE, version: 1 }), AGENT, RELIABLE, CAPTURE_TOPIC);
    await pending;

    expect(lk.published).toHaveLength(1);
    expect(lk.order.indexOf('publishTrack')).toBeGreaterThan(lk.order.indexOf('connect'));
  });

  it('reports connected only after publication succeeds', async () => {
    const lk = fakeLiveKit();
    const mic = microphone();
    const ev = events();
    const transport = createLiveKitTransport(ev, {
      moduleUrl: 'stub',
      loadModule: async () => lk.module as never,
    });

    const pending = transport.connect(connectOptions(mic.stream));
    await vi.waitFor(() => expect(lk.order).toContain('connect'));
    expect(ev.onConnected).not.toHaveBeenCalled();

    lk.emit('dataReceived', encode({ type: CAPTURE_MESSAGE_TYPE, version: 1 }), AGENT, RELIABLE, CAPTURE_TOPIC);
    await pending;

    expect(ev.onConnected).toHaveBeenCalledTimes(1);
  });
});

describe('only the exact marker unlocks the microphone', () => {
  const GOOD = () => encode({ type: CAPTURE_MESSAGE_TYPE, version: 1 });

  it.each([
    ['no sender', [GOOD(), undefined, RELIABLE, CAPTURE_TOPIC]],
    ['a non-agent sender', [GOOD(), VISITOR, RELIABLE, CAPTURE_TOPIC]],
    ['the wrong topic', [GOOD(), AGENT, RELIABLE, 'seenn.public_demo.other']],
    ['no topic', [GOOD(), AGENT, RELIABLE, undefined]],
    ['a lossy packet', [GOOD(), AGENT, LOSSY, CAPTURE_TOPIC]],
    ['malformed json', [encode('{not json'), AGENT, RELIABLE, CAPTURE_TOPIC]],
    ['an extra field', [encode({ type: CAPTURE_MESSAGE_TYPE, version: 1, x: 1 }), AGENT, RELIABLE, CAPTURE_TOPIC]],
    ['a wrong version', [encode({ type: CAPTURE_MESSAGE_TYPE, version: 2 }), AGENT, RELIABLE, CAPTURE_TOPIC]],
  ])('ignores %s, and times out with the microphone unpublished', async (_name, args) => {
    const lk = fakeLiveKit();
    const mic = microphone();
    const transport = createLiveKitTransport(events(), {
      moduleUrl: 'stub',
      loadModule: async () => lk.module as never,
    });

    const pending = transport.connect(connectOptions(mic.stream));
    await vi.waitFor(() => expect(lk.order).toContain('connect'));

    lk.emit('dataReceived', ...(args as unknown[]));

    await expect(pending).rejects.toBeInstanceOf(TransportError);
    await expect(pending).rejects.toMatchObject({ phase: 'capture_handshake' });
    expect(lk.published).toHaveLength(0);
  });

  it('publishes once even if the marker arrives repeatedly', async () => {
    const lk = fakeLiveKit();
    const mic = microphone();
    const transport = createLiveKitTransport(events(), {
      moduleUrl: 'stub',
      loadModule: async () => lk.module as never,
    });

    const pending = transport.connect(connectOptions(mic.stream));
    await vi.waitFor(() => expect(lk.order).toContain('connect'));

    for (let i = 0; i < 4; i += 1) {
      lk.emit('dataReceived', GOOD(), AGENT, RELIABLE, CAPTURE_TOPIC);
    }
    await pending;

    expect(lk.published).toHaveLength(1);
  });

  it('accepts an agent identified only by the state attribute', async () => {
    const lk = fakeLiveKit();
    const mic = microphone();
    const transport = createLiveKitTransport(events(), {
      moduleUrl: 'stub',
      loadModule: async () => lk.module as never,
    });

    const pending = transport.connect(connectOptions(mic.stream));
    await vi.waitFor(() => expect(lk.order).toContain('connect'));

    lk.emit(
      'dataReceived',
      GOOD(),
      { identity: 'a', isLocal: false, attributes: { [AGENT_STATE_ATTRIBUTE]: 'listening' } },
      RELIABLE,
      CAPTURE_TOPIC,
    );
    await pending;
    expect(lk.published).toHaveLength(1);
  });
});

describe('failure cleanup', () => {
  it('a timeout leaves nothing published and reports the handshake phase', async () => {
    const lk = fakeLiveKit();
    const mic = microphone();
    const transport = createLiveKitTransport(events(), {
      moduleUrl: 'stub',
      loadModule: async () => lk.module as never,
    });

    await expect(transport.connect(connectOptions(mic.stream))).rejects.toMatchObject({
      phase: 'capture_handshake',
    });
    expect(lk.published).toHaveLength(0);

    // The widget owns microphone and room teardown; prove the transport's own
    // disconnect still closes the room it opened.
    await transport.disconnect();
    expect(lk.order).toContain('disconnect');
  });

  it('a room that drops before the marker fails fast rather than waiting', async () => {
    const lk = fakeLiveKit();
    const mic = microphone();
    const transport = createLiveKitTransport(events(), {
      moduleUrl: 'stub',
      loadModule: async () => lk.module as never,
    });

    const pending = transport.connect(connectOptions(mic.stream, { captureTimeoutMs: 30_000 }));
    await vi.waitFor(() => expect(lk.order).toContain('connect'));

    lk.emit('disconnected');

    await expect(pending).rejects.toMatchObject({ phase: 'capture_handshake' });
    expect(lk.published).toHaveLength(0);
  });
});

describe('the unrecorded path is untouched', () => {
  it('publishes immediately and never waits for a marker', async () => {
    const lk = fakeLiveKit();
    const mic = microphone();
    const ev = events();
    const transport = createLiveKitTransport(ev, {
      moduleUrl: 'stub',
      loadModule: async () => lk.module as never,
    });

    await transport.connect(connectOptions(mic.stream, { requireCaptureMarker: false }));

    expect(lk.published).toHaveLength(1);
    expect(ev.onConnected).toHaveBeenCalledTimes(1);
    // No listener is registered at all when capture is not required.
    expect(lk.order).not.toContain('on:dataReceived');
  });

  it('defaults to the unrecorded behaviour when the flag is absent', async () => {
    const lk = fakeLiveKit();
    const mic = microphone();
    const transport = createLiveKitTransport(events(), {
      moduleUrl: 'stub',
      loadModule: async () => lk.module as never,
    });

    const options = connectOptions(mic.stream) as Record<string, unknown>;
    delete options['requireCaptureMarker'];
    await transport.connect(options as never);

    expect(lk.published).toHaveLength(1);
  });
});
