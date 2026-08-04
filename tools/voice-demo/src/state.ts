/**
 * The demo's state machine, as a pure reducer.
 *
 * Kept free of DOM and network so the transition rules can be tested directly
 * rather than inferred from the UI. `reduce()` returns the *same* context
 * object when an event is not legal in the current state, which is what makes
 * "you cannot start a second session while one is connecting" a property of
 * the machine instead of a flag somebody remembers to check.
 */

import type { DemoErrorCode, DemoSession, RecordingConsent } from './contract';

/**
 * The ten UI states.
 *
 * `assistantThinking` was added when readiness moved to the remote agent: the
 * documented `lk.agent.state` vocabulary distinguishes thinking from speaking,
 * and collapsing them would throw away information the agent is already
 * publishing.
 *
 * Microphone denial is deliberately NOT a separate state: it is `error` with
 * `errorCode: 'microphone_denied'`, which still renders its own copy and
 * re-enable instructions. Keeping the state set closed makes the transition
 * table checkable; the distinct UI comes from the error code.
 */
export type DemoState =
  | 'unavailable'
  | 'ready'
  | 'requestingMicrophone'
  | 'connecting'
  | 'listening'
  | 'assistantThinking'
  | 'assistantSpeaking'
  | 'reconnecting'
  | 'finished'
  | 'rateLimited'
  | 'error';

/** Client-side failures, alongside the server's `DemoErrorCode`. */
export type ClientErrorCode =
  | 'agent_unavailable'
  | 'agent_lost'
  | 'microphone_denied'
  | 'microphone_unavailable'
  | 'language_unavailable'
  | 'browser_unsupported'
  | 'network_error'
  | 'contract_violation'
  | 'transport_failed'
  /** The agent never confirmed it was recording, so we stopped before the
   *  microphone was published. Only reachable on the consented path. */
  | 'capture_unavailable'
  | 'reconnect_failed'
  | 'consent_declined'
  | 'session_expired_before_start';

export type AnyErrorCode = DemoErrorCode | ClientErrorCode;

/** Why the demo is refusing traffic — drives distinct copy. */
export type RateLimitScope = 'per_visitor' | 'global_capacity';

export type FinishReason =
  | 'user_disconnected'
  | 'session_expired'
  | 'remote_disconnected'
  | 'page_hidden';

export interface DemoContext {
  state: DemoState;
  /** Set when `state === 'error'`. */
  errorCode: AnyErrorCode | null;
  /** Set when `state === 'rateLimited'`. */
  rateLimitScope: RateLimitScope | null;
  /** Set when `state === 'finished'`. */
  finishReason: FinishReason | null;
  /** Why the demo is unavailable, when it is. */
  unavailableReason: string | null;
  /** Server-authored consent awaiting a decision. Never widget-authored. */
  pendingConsent: RecordingConsent | null;
  /** Consent the visitor accepted, echoed back to the backend. */
  acceptedConsent: { policyVersion: string; locale: string; acceptedAt: string } | null;
  /** The live session, once granted. Cleared on finish/error. */
  session: DemoSession | null;
  /** Guards duplicate sessions: true from START until finished/error. */
  connectionInFlight: boolean;
  /** Bumped on every start; lets late async work detect it is stale. */
  attempt: number;
  /** True once the browser joined the room. Diagnostic only — not readiness. */
  roomConnected: boolean;
  /** Survives teardown so a failure can show a Support ID. */
  lastSessionId: string | null;
  /**
   * Epoch ms before which START is refused, from a 429's `Retry-After`.
   * Honouring this is the difference between telling a visitor to wait and
   * actually not hammering an endpoint that asked us to back off.
   */
  retryAfterUntil: number | null;
}

export type DemoEvent =
  | { type: 'FLAG_ENABLED' }
  | { type: 'FLAG_DISABLED'; reason: string }
  /** `at` is the caller's clock, so the Retry-After guard stays pure. */
  | { type: 'START'; at: number }
  | { type: 'MIC_GRANTED' }
  | { type: 'MIC_DENIED' }
  | { type: 'MIC_UNAVAILABLE' }
  | { type: 'CONSENT_REQUIRED'; consent: RecordingConsent }
  | { type: 'CONSENT_ACCEPTED'; acceptedAt: string }
  | { type: 'CONSENT_DECLINED' }
  | { type: 'SESSION_GRANTED'; session: DemoSession }
  /** Browser joined the room and published its microphone. NOT readiness. */
  | { type: 'ROOM_CONNECTED' }
  /** The remote agent is present but cannot hear anyone yet. */
  | { type: 'AGENT_PENDING' }
  | { type: 'AGENT_READY' }
  | { type: 'AGENT_THINKING' }
  | { type: 'AGENT_SPEAKING' }
  | { type: 'RECONNECTING' }
  | { type: 'RECONNECTED' }
  | { type: 'DISCONNECT'; reason: FinishReason }
  | { type: 'RATE_LIMITED'; scope: RateLimitScope; retryAfterSeconds?: number | null; at?: number }
  | { type: 'DEMO_UNAVAILABLE'; reason: string }
  | { type: 'ERROR'; code: AnyErrorCode }
  | { type: 'RESET' };

/**
 * States in which the widget holds something that must be released.
 *
 * `requestingMicrophone` counts: a getUserMedia promise in flight can resolve
 * after the visitor has navigated away, handing a live microphone track to a
 * page that is gone. `connecting` counts for the same reason plus the room.
 */
export const ACTIVE_STATES: readonly DemoState[] = [
  'requestingMicrophone',
  'connecting',
  'listening',
  'assistantThinking',
  'assistantSpeaking',
  'reconnecting',
];

/** States in which the remote agent has confirmed it can hear the visitor. */
export const AGENT_READY_STATES: readonly DemoState[] = [
  'listening',
  'assistantThinking',
  'assistantSpeaking',
];

/** States from which the visitor may start a session. */
const STARTABLE: readonly DemoState[] = ['ready', 'finished', 'error', 'rateLimited'];

export function initialContext(unavailable: string | null): DemoContext {
  return {
    state: unavailable ? 'unavailable' : 'ready',
    errorCode: null,
    rateLimitScope: null,
    finishReason: null,
    unavailableReason: unavailable,
    pendingConsent: null,
    acceptedConsent: null,
    session: null,
    connectionInFlight: false,
    attempt: 0,
    roomConnected: false,
    lastSessionId: null,
    retryAfterUntil: null,
  };
}

export function agentIsReady(state: DemoState): boolean {
  return AGENT_READY_STATES.includes(state);
}

export function isActive(state: DemoState): boolean {
  return ACTIVE_STATES.includes(state);
}

/**
 * Applies an event. Returns the identical object reference when the event is
 * not legal in the current state — callers can use `next === prev` to detect a
 * rejected transition, and tests assert on it.
 */
export function reduce(context: DemoContext, event: DemoEvent): DemoContext {
  const { state } = context;

  switch (event.type) {
    case 'FLAG_ENABLED':
      if (state !== 'unavailable') return context;
      return { ...context, state: 'ready', unavailableReason: null };

    case 'FLAG_DISABLED':
      if (state === 'unavailable') return context;
      return {
        ...initialContext(event.reason),
        attempt: context.attempt,
      };

    case 'START':
      // The single guard that prevents duplicate sessions.
      if (!STARTABLE.includes(state) || context.connectionInFlight) return context;
      // And the one that honours a server's Retry-After instead of just
      // telling the visitor to wait while letting them hammer it anyway.
      if (context.retryAfterUntil !== null && event.at < context.retryAfterUntil) return context;
      return {
        ...initialContext(null),
        state: 'requestingMicrophone',
        // Consent already accepted this page-view carries forward, so a retry
        // does not re-prompt for the same policy version.
        acceptedConsent: context.acceptedConsent,
        connectionInFlight: true,
        attempt: context.attempt + 1,
      };

    case 'MIC_GRANTED':
      if (state !== 'requestingMicrophone') return context;
      return { ...context, state: 'connecting' };

    case 'MIC_DENIED':
      if (state !== 'requestingMicrophone') return context;
      return {
        ...context,
        state: 'error',
        errorCode: 'microphone_denied',
        connectionInFlight: false,
      };

    case 'MIC_UNAVAILABLE':
      if (state !== 'requestingMicrophone') return context;
      return {
        ...context,
        state: 'error',
        errorCode: 'microphone_unavailable',
        connectionInFlight: false,
      };

    case 'CONSENT_REQUIRED':
      // Consent is collected during `connecting`; the UI swaps the spinner for
      // the server's wording rather than introducing an eleventh state.
      if (state !== 'connecting') return context;
      return { ...context, pendingConsent: event.consent };

    case 'CONSENT_ACCEPTED': {
      if (state !== 'connecting' || !context.pendingConsent) return context;
      const consent = context.pendingConsent;
      return {
        ...context,
        pendingConsent: null,
        acceptedConsent: {
          policyVersion: consent.policyVersion,
          locale: consent.locale,
          acceptedAt: event.acceptedAt,
        },
      };
    }

    case 'CONSENT_DECLINED':
      if (state !== 'connecting') return context;
      return {
        ...context,
        state: 'finished',
        finishReason: 'user_disconnected',
        pendingConsent: null,
        connectionInFlight: false,
      };

    case 'SESSION_GRANTED':
      if (state !== 'connecting') return context;
      return {
        ...context,
        session: event.session,
        // Kept past teardown so a failure can show a Support ID.
        lastSessionId: event.session.sessionId,
      };

    case 'ROOM_CONNECTED':
      // Joining the room and publishing our own microphone is NOT readiness.
      // Only the remote agent can move this forward. Showing "listening" here
      // is the bug this event was renamed to prevent.
      if (state !== 'connecting') return context;
      return { ...context, roomConnected: true };

    case 'AGENT_PENDING':
      // The agent exists but cannot hear anyone. Stay on connecting.
      if (state !== 'connecting') return context;
      return context;

    case 'AGENT_READY':
      if (state !== 'connecting' && !AGENT_READY_STATES.includes(state)) return context;
      if (state === 'listening') return context;
      return { ...context, state: 'listening' };

    case 'AGENT_THINKING':
      if (state !== 'connecting' && !AGENT_READY_STATES.includes(state)) return context;
      if (state === 'assistantThinking') return context;
      return { ...context, state: 'assistantThinking' };

    case 'AGENT_SPEAKING':
      if (state !== 'connecting' && !AGENT_READY_STATES.includes(state)) return context;
      if (state === 'assistantSpeaking') return context;
      return { ...context, state: 'assistantSpeaking' };

    case 'RECONNECTING':
      if (!AGENT_READY_STATES.includes(state)) return context;
      return { ...context, state: 'reconnecting' };

    case 'RECONNECTED':
      if (state !== 'reconnecting') return context;
      return { ...context, state: 'listening' };

    case 'DISCONNECT':
      if (!isActive(state)) return context;
      return {
        ...context,
        state: 'finished',
        finishReason: event.reason,
        pendingConsent: null,
        session: null,
        connectionInFlight: false,
      };

    case 'RATE_LIMITED': {
      if (state !== 'connecting' && state !== 'requestingMicrophone') return context;
      const seconds = event.retryAfterSeconds ?? null;
      const from = event.at ?? 0;
      return {
        ...context,
        state: 'rateLimited',
        rateLimitScope: event.scope,
        retryAfterUntil: seconds !== null && seconds > 0 ? from + seconds * 1000 : null,
        pendingConsent: null,
        session: null,
        connectionInFlight: false,
      };
    }

    case 'DEMO_UNAVAILABLE':
      if (state === 'unavailable') return context;
      return { ...initialContext(event.reason), attempt: context.attempt };

    case 'ERROR':
      if (state === 'unavailable' || state === 'error') return context;
      return {
        ...context,
        state: 'error',
        errorCode: event.code,
        pendingConsent: null,
        // The live session goes; its identifier stays, so support can be given
        // something to quote.
        session: null,
        connectionInFlight: false,
      };

    case 'RESET':
      if (state === 'unavailable') return context;
      return {
        ...initialContext(null),
        acceptedConsent: context.acceptedConsent,
        attempt: context.attempt,
        // A server asked us to back off; clearing the UI does not clear that.
        retryAfterUntil: context.retryAfterUntil,
      };

    default: {
      // Exhaustiveness: adding an event without handling it fails typecheck.
      const never: never = event;
      return never;
    }
  }
}
