/**
 * Regression coverage for the LiveKit publication path.
 *
 * The bug this file exists for: the transport built a `LocalAudioTrack` from
 * the already-approved microphone stream and published it with no source, so
 * LiveKit registered it as `Track.Source.Unknown`. Our participant token grants
 * only `Track.Source.Microphone`, so the server refused the publication and the
 * widget surfaced a generic `transport_failed`.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createLiveKitTransport } from '../src/transport';
import type { TransportEvents } from '../src/transport';

const PRE_ACQUIRED = { id: 'pre-acquired-mic-track', kind: 'audio' } as unknown as MediaStreamTrack;

function fakeMicrophone(): MediaStream {
  return { getAudioTracks: () => [PRE_ACQUIRED], getTracks: () => [PRE_ACQUIRED] } as unknown as MediaStream;
}

/** Captures whatever MediaStreamTrack the transport wraps. */
class FakeLocalAudioTrack {
  readonly mediaStreamTrack: MediaStreamTrack;
  constructor(track: MediaStreamTrack) {
    this.mediaStreamTrack = track;
  }
}

interface FakeModuleOptions {
  withLocalAudioTrack?: boolean;
  connectImpl?: () => Promise<void>;
  publishImpl?: (track: unknown, publishOptions?: unknown) => Promise<unknown>;
}

function fakeLiveKitModule(options: FakeModuleOptions = {}) {
  // Params declared so recorded calls stay typed at the assertion site.
  const publishTrack = vi.fn(
    options.publishImpl ?? (async (_track: unknown, _publishOptions?: unknown) => undefined),
  );
  const setMicrophoneEnabled = vi.fn(async () => undefined);
  const connect = vi.fn(options.connectImpl ?? (async () => undefined));
  const disconnect = vi.fn(async () => undefined);
  const handlers: Record<string, (...args: unknown[]) => void> = {};

  const room = {
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      handlers[event] = handler;
    }),
    connect,
    disconnect,
    startAudio: vi.fn(async () => undefined),
    localParticipant: { publishTrack, setMicrophoneEnabled },
    remoteParticipants: new Map(),
  };

  const mod = {
    Room: vi.fn(() => room),
    RoomEvent: {
      TrackSubscribed: 'trackSubscribed',
      TrackUnsubscribed: 'trackUnsubscribed',
      Reconnecting: 'reconnecting',
      Reconnected: 'reconnected',
      Disconnected: 'disconnected',
    },
    Track: {
      Kind: { Audio: 'audio' },
      // The real enum value; the token is scoped to exactly this.
      Source: { Microphone: 'microphone', Camera: 'camera', Unknown: 'unknown' },
    },
    ...(options.withLocalAudioTrack === false ? {} : { LocalAudioTrack: FakeLocalAudioTrack }),
  };

  return { mod, room, publishTrack, setMicrophoneEnabled, connect, disconnect, handlers };
}

function noopEvents(): TransportEvents {
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

function build(mod: unknown, events = noopEvents()) {
  return createLiveKitTransport(events, {
    moduleUrl: 'https://cdn.example/livekit',
    loadModule: async () => mod as never,
  });
}

const connectArgs = () => ({
  url: 'wss://x.livekit.cloud',
  token: 'super-secret-participant-jwt',
  microphone: fakeMicrophone(),
  audioElement: document.createElement('audio'),
});

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('microphone publication', () => {
  it('publishes with exactly { source: Track.Source.Microphone }', async () => {
    const { mod, publishTrack } = fakeLiveKitModule();
    const transport = build(mod);

    await transport.connect(connectArgs());

    expect(publishTrack).toHaveBeenCalledTimes(1);
    const [, publishOptions] = publishTrack.mock.calls[0]!;
    // Exactly this — an Unknown source is what the token refuses.
    expect(publishOptions).toEqual({ source: 'microphone' });
    expect(publishOptions).toEqual({ source: mod.Track.Source.Microphone });

    await transport.disconnect();
  });

  it('publishes the pre-acquired MediaStreamTrack, not a fresh capture', async () => {
    const { mod, publishTrack, setMicrophoneEnabled } = fakeLiveKitModule();
    const transport = build(mod);

    await transport.connect(connectArgs());

    const [published] = publishTrack.mock.calls[0]!;
    expect(published).toBeInstanceOf(FakeLocalAudioTrack);
    expect((published as FakeLocalAudioTrack).mediaStreamTrack).toBe(PRE_ACQUIRED);

    // Re-capturing would raise a second permission sheet in Firefox.
    expect(setMicrophoneEnabled).not.toHaveBeenCalled();

    await transport.disconnect();
  });

  it('never publishes with an Unknown or absent source', async () => {
    const { mod, publishTrack } = fakeLiveKitModule();
    const transport = build(mod);

    await transport.connect(connectArgs());

    const [, publishOptions] = publishTrack.mock.calls[0]!;
    expect(publishOptions).toBeDefined();
    expect((publishOptions as { source?: string }).source).not.toBe('unknown');
    expect((publishOptions as { source?: string }).source).toBeTruthy();

    await transport.disconnect();
  });

  it('falls back to setMicrophoneEnabled when the SDK exposes no LocalAudioTrack', async () => {
    const { mod, publishTrack, setMicrophoneEnabled } = fakeLiveKitModule({
      withLocalAudioTrack: false,
    });
    const transport = build(mod);

    await transport.connect(connectArgs());

    expect(publishTrack).not.toHaveBeenCalled();
    expect(setMicrophoneEnabled).toHaveBeenCalledWith(true);

    await transport.disconnect();
  });
});

describe('failure diagnostics record the phase', () => {
  it('module loading', async () => {
    const transport = createLiveKitTransport(noopEvents(), {
      moduleUrl: 'https://cdn.example/livekit',
      loadModule: async () => {
        throw new Error('network down');
      },
    });

    await expect(transport.connect(connectArgs())).rejects.toMatchObject({
      phase: 'module_load',
    });
  });

  it('room connection', async () => {
    const { mod } = fakeLiveKitModule({
      connectImpl: async () => {
        throw Object.assign(new Error('bad token'), { name: 'ConnectionError' });
      },
    });
    const transport = build(mod);

    await expect(transport.connect(connectArgs())).rejects.toMatchObject({
      phase: 'room_connect',
    });
  });

  it('microphone publication — the failure this bug produced', async () => {
    const { mod } = fakeLiveKitModule({
      publishImpl: async () => {
        throw Object.assign(new Error('insufficient permissions'), { name: 'PublishError' });
      },
    });
    const transport = build(mod);

    await expect(transport.connect(connectArgs())).rejects.toMatchObject({
      phase: 'microphone_publish',
    });
  });

  it('a publish failure is no longer mislabelled as a connect failure', async () => {
    const { mod } = fakeLiveKitModule({
      publishImpl: async () => {
        throw new Error('nope');
      },
    });
    const transport = build(mod);

    const error = await transport.connect(connectArgs()).catch((e: unknown) => e);
    expect((error as { phase: string }).phase).toBe('microphone_publish');
    expect((error as Error).message).not.toMatch(/connect failed/i);
  });
});

describe('diagnostics leak nothing sensitive', () => {
  it('the thrown error carries no token, url or track identity', async () => {
    const { mod } = fakeLiveKitModule({
      publishImpl: async () => {
        throw new Error('server said: token=super-secret-participant-jwt is bad');
      },
    });
    const transport = build(mod);

    const error = (await transport.connect(connectArgs()).catch((e: unknown) => e)) as Error;
    const text = `${error.name} ${error.message}`;

    expect(text).not.toContain('super-secret-participant-jwt');
    expect(text).not.toContain('wss://x.livekit.cloud');
    expect(text).not.toContain('pre-acquired-mic-track');
  });

  it('nothing is written to the console during a normal connect', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const { mod } = fakeLiveKitModule();
    const transport = build(mod);
    await transport.connect(connectArgs());
    await transport.disconnect();

    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('lifecycle is preserved', () => {
  it('disconnect closes the room', async () => {
    const { mod, disconnect } = fakeLiveKitModule();
    const transport = build(mod);

    await transport.connect(connectArgs());
    await transport.disconnect();

    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('disconnect is safe before connect and repeatable', async () => {
    const { mod, disconnect } = fakeLiveKitModule();
    const transport = build(mod);

    await expect(transport.disconnect()).resolves.toBeUndefined();
    await transport.connect(connectArgs());
    await transport.disconnect();
    await transport.disconnect();

    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('a room that refuses to close does not throw', async () => {
    const { mod, room } = fakeLiveKitModule();
    room.disconnect = vi.fn(async () => {
      throw new Error('already gone');
    });
    const transport = build(mod);

    await transport.connect(connectArgs());
    await expect(transport.disconnect()).resolves.toBeUndefined();
  });

  it('reports connection through onConnected', async () => {
    const events = noopEvents();
    const { mod } = fakeLiveKitModule();
    const transport = build(mod, events);

    await transport.connect(connectArgs());
    expect(events.onConnected).toHaveBeenCalledTimes(1);

    await transport.disconnect();
  });
});
