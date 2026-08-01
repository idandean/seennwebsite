/**
 * The real-time audio leg, behind an interface.
 *
 * The widget talks to `VoiceTransport`, never to livekit-client directly. That
 * keeps the state machine testable without a WebRTC stack, and keeps the
 * ~200KB SDK out of the page until a visitor actually clicks.
 */

import { logger, safeUrl } from './logging';

export interface TransportEvents {
  onConnected(): void;
  onDisconnected(): void;
  onReconnecting(): void;
  onReconnected(): void;
  /** Drives the listening ⇄ assistantSpeaking split. */
  onAssistantSpeaking(speaking: boolean): void;
  /** 0..1, for the orb. */
  onLevel(level: number): void;
  onError(error: Error): void;
}

export interface ConnectOptions {
  url: string;
  token: string;
  /** Already-approved microphone stream; the transport must not re-request. */
  microphone: MediaStream;
  /** Element unlocked during the click gesture — iOS Safari needs this one. */
  audioElement: HTMLAudioElement;
}

export interface VoiceTransport {
  connect(options: ConnectOptions): Promise<void>;
  disconnect(): Promise<void>;
}

export type TransportFactory = (events: TransportEvents) => VoiceTransport;

/** Minimal structural view of the parts of livekit-client we use. */
interface LiveKitModule {
  Room: new (options?: unknown) => LiveKitRoom;
  RoomEvent: Record<string, string>;
  Track: { Kind: { Audio: string } };
  LocalAudioTrack?: new (track: MediaStreamTrack) => unknown;
}

interface LiveKitRoom {
  on(event: string, handler: (...args: unknown[]) => void): void;
  connect(url: string, token: string): Promise<void>;
  disconnect(): Promise<void> | void;
  startAudio?: () => Promise<void>;
  localParticipant: {
    publishTrack(track: unknown): Promise<unknown>;
    setMicrophoneEnabled(enabled: boolean): Promise<unknown>;
  };
  remoteParticipants?: Map<string, RemoteParticipant> | undefined;
  participants?: Map<string, RemoteParticipant> | undefined;
}

interface RemoteParticipant {
  isLocal?: boolean;
  audioLevel?: number;
  isSpeaking?: boolean;
}

export interface LiveKitTransportOptions {
  moduleUrl: string;
  /** Injected in tests instead of hitting a CDN. */
  loadModule?: (url: string) => Promise<LiveKitModule>;
}

/** Speech is bursty; a bare level flickers. Rise fast, fall slow. */
function smooth(previous: number, next: number): number {
  return next > previous ? next : previous + (next - previous) * 0.25;
}

export function createLiveKitTransport(
  events: TransportEvents,
  options: LiveKitTransportOptions,
): VoiceTransport {
  let room: LiveKitRoom | null = null;
  let rafId = 0;
  let level = 0;
  let speaking = false;
  let disposed = false;

  const load =
    options.loadModule ??
    ((url: string) => import(/* @vite-ignore */ url) as Promise<LiveKitModule>);

  function stopMetering(): void {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }

  function startMetering(lk: LiveKitModule): void {
    const tick = (): void => {
      if (disposed || !room) return;

      let peak = 0;
      // `remoteParticipants` in livekit-client v2, `participants` in v1.
      const remotes = room.remoteParticipants ?? room.participants;
      remotes?.forEach((participant) => {
        if (participant.isLocal) return;
        if (typeof participant.audioLevel === 'number' && participant.audioLevel > peak) {
          peak = participant.audioLevel;
        }
        if (participant.isSpeaking && peak < 0.3) peak = 0.3;
      });

      level = smooth(level, peak);
      events.onLevel(level);

      // Hysteresis: without a gap between the on and off thresholds the state
      // flips on every inter-word pause.
      const nowSpeaking = speaking ? level > 0.06 : level > 0.14;
      if (nowSpeaking !== speaking) {
        speaking = nowSpeaking;
        events.onAssistantSpeaking(speaking);
      }

      rafId = requestAnimationFrame(tick);
    };
    void lk;
    rafId = requestAnimationFrame(tick);
  }

  return {
    async connect({ url, token, microphone, audioElement }: ConnectOptions): Promise<void> {
      const lk = await load(options.moduleUrl).catch((cause: unknown) => {
        logger.error('failed to load the audio engine', { module: safeUrl(options.moduleUrl) });
        throw new Error(`livekit module load failed: ${(cause as Error)?.name ?? 'unknown'}`);
      });

      const instance = new lk.Room({ adaptiveStream: true, dynacast: true });
      room = instance;

      instance.on(lk.RoomEvent['TrackSubscribed'] ?? 'trackSubscribed', (...args: unknown[]) => {
        const track = args[0] as { kind?: string; attach?: (el: HTMLAudioElement) => void };
        if (track?.kind !== lk.Track.Kind.Audio) return;
        // Reuse the element unlocked during the click, rather than creating a
        // new one after the gesture has passed.
        track.attach?.(audioElement);
        void audioElement.play().catch(() => undefined);
      });

      instance.on(lk.RoomEvent['Reconnecting'] ?? 'reconnecting', () => events.onReconnecting());
      instance.on(lk.RoomEvent['Reconnected'] ?? 'reconnected', () => events.onReconnected());
      instance.on(lk.RoomEvent['Disconnected'] ?? 'disconnected', () => events.onDisconnected());

      try {
        await instance.connect(url, token);

        // Publish the stream the visitor already approved. Calling
        // setMicrophoneEnabled() would run getUserMedia a second time, and
        // Firefox raises a fresh permission sheet every time unless the visitor
        // ticked "Remember" — a second prompt mid-demo.
        const audioTrack = microphone.getAudioTracks()[0];
        if (audioTrack && typeof lk.LocalAudioTrack === 'function') {
          await instance.localParticipant.publishTrack(new lk.LocalAudioTrack(audioTrack));
        } else {
          await instance.localParticipant.setMicrophoneEnabled(true);
        }

        await instance.startAudio?.().catch(() => undefined);
      } catch (cause) {
        throw new Error(`livekit connect failed: ${(cause as Error)?.name ?? 'unknown'}`);
      }

      startMetering(lk);
      events.onConnected();
    },

    async disconnect(): Promise<void> {
      disposed = true;
      stopMetering();
      const instance = room;
      room = null;
      if (!instance) return;
      try {
        await instance.disconnect();
      } catch {
        // A room that will not close cleanly is still a room we are done with.
      }
    },
  };
}
