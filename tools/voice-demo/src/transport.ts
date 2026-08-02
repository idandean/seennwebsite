/**
 * The real-time audio leg, behind an interface.
 *
 * The widget talks to `VoiceTransport`, never to livekit-client directly. That
 * keeps the state machine testable without a WebRTC stack, and keeps the
 * ~200KB SDK out of the page until a visitor actually clicks.
 */

import { AGENT_STATE_ATTRIBUTE } from './agent';
import { logger, safeUrl } from './logging';

export interface TransportEvents {
  onConnected(): void;
  onDisconnected(): void;
  onReconnecting(): void;
  onReconnected(): void;
  /**
   * The remote agent's `lk.agent.state`, or null when no agent participant is
   * present. This — not our own microphone publication — is what decides
   * whether the visitor is actually being listened to.
   */
  onAgentState(state: string | null): void;
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

/** Which leg of `connect()` failed. */
export type TransportPhase = 'module_load' | 'room_connect' | 'microphone_publish';

/**
 * Carries the phase so a failure is actionable without a repro.
 *
 * Previously connect and publish shared one try/catch, so a rejected
 * publication — the token-scope bug — reported "connect failed" and sent
 * everyone looking at the wrong leg.
 *
 * The message deliberately carries only the underlying error's *name*, never
 * its message: LiveKit failures can quote server text, and a token, room URL
 * or device label must not end up in a console or a bug-report screenshot.
 */
export class TransportError extends Error {
  readonly phase: TransportPhase;
  readonly causeName: string;

  constructor(phase: TransportPhase, cause?: unknown) {
    const causeName = (cause as Error)?.name ?? 'unknown';
    super(`livekit ${phase} failed (${causeName})`);
    this.name = 'TransportError';
    this.phase = phase;
    this.causeName = causeName;
  }
}

export type TransportFactory = (events: TransportEvents) => VoiceTransport;

/** Minimal structural view of the parts of livekit-client we use. */
interface LiveKitModule {
  Room: new (options?: unknown) => LiveKitRoom;
  RoomEvent: Record<string, string>;
  /** `Source` matters: the participant token is scoped to Microphone only. */
  Track: { Kind: { Audio: string }; Source: { Microphone: string } };
  LocalAudioTrack?: new (track: MediaStreamTrack) => unknown;
}

interface LiveKitRoom {
  on(event: string, handler: (...args: unknown[]) => void): void;
  connect(url: string, token: string): Promise<void>;
  disconnect(): Promise<void> | void;
  startAudio?: () => Promise<void>;
  localParticipant: {
    publishTrack(track: unknown, options?: unknown): Promise<unknown>;
    setMicrophoneEnabled(enabled: boolean): Promise<unknown>;
  };
  remoteParticipants?: Map<string, RemoteParticipant> | undefined;
  participants?: Map<string, RemoteParticipant> | undefined;
}

interface RemoteParticipant {
  identity?: string;
  isLocal?: boolean;
  /** livekit-client 2.21.0 exposes this; the documented way to spot an agent. */
  isAgent?: boolean;
  audioLevel?: number;
  isSpeaking?: boolean;
  attributes?: Readonly<Record<string, string>> | undefined;
}

export interface LiveKitTransportOptions {
  moduleUrl: string;
  /** Injected in tests instead of hitting a CDN. */
  loadModule?: (url: string) => Promise<LiveKitModule>;
}

/**
 * An agent is a participant the SDK flags as one, or — belt and braces — any
 * remote participant carrying the documented agent-state attribute.
 */
function isAgentParticipant(participant: RemoteParticipant): boolean {
  if (participant.isLocal) return false;
  if (participant.isAgent === true) return true;
  return typeof participant.attributes?.[AGENT_STATE_ATTRIBUTE] === 'string';
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
  let disposed = false;
  /** Last value reported upward, so identical attribute churn stays quiet. */
  let lastAgentState: string | null | undefined;

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
      // Drives the orb's reactivity ONLY. Audio level says nothing about
      // whether the agent is ready — inferring that from it is the bug this
      // module was rewritten to remove.
      events.onLevel(level);

      rafId = requestAnimationFrame(tick);
    };
    void lk;
    rafId = requestAnimationFrame(tick);
  }

  return {
    async connect({ url, token, microphone, audioElement }: ConnectOptions): Promise<void> {
      // --- Phase 1: module load ---------------------------------------------
      const lk = await load(options.moduleUrl).catch((cause: unknown) => {
        logger.error('failed to load the audio engine', { module: safeUrl(options.moduleUrl) });
        throw new TransportError('module_load', cause);
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

      // --- Remote agent readiness -------------------------------------------
      // Event names verified against the pinned SDK's dist/src/room/events.d.ts.
      const findAgent = (): RemoteParticipant | undefined => {
        const remotes = instance.remoteParticipants ?? instance.participants;
        let found: RemoteParticipant | undefined;
        remotes?.forEach((participant) => {
          if (!found && isAgentParticipant(participant)) found = participant;
        });
        return found;
      };

      const reportAgent = (): void => {
        if (disposed) return;
        const agent = findAgent();
        const next = agent ? (agent.attributes?.[AGENT_STATE_ATTRIBUTE] ?? null) : null;
        // Only on change: attributesChanged fires for unrelated keys too.
        if (next === lastAgentState) return;
        lastAgentState = next;
        events.onAgentState(next);
      };

      instance.on(lk.RoomEvent['ParticipantConnected'] ?? 'participantConnected', reportAgent);
      instance.on(lk.RoomEvent['ParticipantDisconnected'] ?? 'participantDisconnected', reportAgent);
      instance.on(
        lk.RoomEvent['ParticipantAttributesChanged'] ?? 'participantAttributesChanged',
        reportAgent,
      );

      instance.on(lk.RoomEvent['Reconnecting'] ?? 'reconnecting', () => events.onReconnecting());
      instance.on(lk.RoomEvent['Reconnected'] ?? 'reconnected', () => events.onReconnected());
      instance.on(lk.RoomEvent['Disconnected'] ?? 'disconnected', () => events.onDisconnected());

      // --- Phase 2: room connection -----------------------------------------
      try {
        await instance.connect(url, token);
      } catch (cause) {
        throw new TransportError('room_connect', cause);
      }

      // --- Phase 3: microphone publication ----------------------------------
      try {
        // Publish the stream the visitor already approved. Calling
        // setMicrophoneEnabled() would run getUserMedia a second time, and
        // Firefox raises a fresh permission sheet every time unless the visitor
        // ticked "Remember" — a second prompt mid-demo.
        const audioTrack = microphone.getAudioTracks()[0];
        if (audioTrack && typeof lk.LocalAudioTrack === 'function') {
          // The source is REQUIRED. Without it LiveKit registers the track as
          // Track.Source.Unknown, and our participant token grants only
          // Track.Source.Microphone — so the server rejects the publication and
          // the whole session fails after the visitor has already granted the
          // microphone. This is the one line that bug turned on.
          await instance.localParticipant.publishTrack(new lk.LocalAudioTrack(audioTrack), {
            source: lk.Track.Source.Microphone,
          });
        } else {
          // Fallback for a build that does not export LocalAudioTrack. This
          // path captures its own track and LiveKit tags it as Microphone
          // itself, so it needs no source option.
          await instance.localParticipant.setMicrophoneEnabled(true);
        }
      } catch (cause) {
        throw new TransportError('microphone_publish', cause);
      }

      // Non-fatal: playback can be unlocked later by the element itself.
      await instance.startAudio?.().catch(() => undefined);

      startMetering(lk);
      events.onConnected();

      // The agent may already be in the room, in which case no event will fire.
      reportAgent();
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
