/**
 * The remote agent's readiness vocabulary.
 *
 * ---------------------------------------------------------------------------
 * NOTHING HERE IS INVENTED
 * ---------------------------------------------------------------------------
 * `lk.agent.state` is the participant attribute LiveKit's agents publish, and
 * the nine values below are the documented set (LiveKit "Agent state" docs).
 * The pinned livekit-client 2.21.0 ships **no** agent-session or voice-assistant
 * state helper — that lives in @livekit/components-react, which this vanilla
 * integration does not and should not pull in. Verified against the package:
 *
 *   dist/src/room/participant/Participant.d.ts
 *     get attributes(): Readonly<Record<string, string>>
 *     get isAgent(): boolean
 *   dist/src/room/events.d.ts
 *     ParticipantConnected           = "participantConnected"
 *     ParticipantDisconnected        = "participantDisconnected"
 *     ParticipantAttributesChanged   = "participantAttributesChanged"
 *
 * So readiness is read from the remote participant's attributes, and this
 * module is the only place that decides what a value means.
 *
 * The rule that matters: anything not documented is treated as NOT ready. A
 * new SDK value must never be able to make the page claim the secretary is
 * listening when she is not — which is exactly the bug this replaces.
 */

/** The documented participant attribute key. */
export const AGENT_STATE_ATTRIBUTE = 'lk.agent.state';

/** Every documented value of `lk.agent.state`. */
export const DOCUMENTED_AGENT_STATES = [
  'connecting',
  'pre-connect-buffering',
  'initializing',
  'idle',
  'listening',
  'thinking',
  'speaking',
  'disconnected',
  'failed',
] as const;

export type AgentState = (typeof DOCUMENTED_AGENT_STATES)[number];

/**
 * What the widget does about a given agent state.
 *
 * - `pending`  — agent exists but is not ready; the UI stays on "connecting"
 * - `ready`    — the ONLY readiness that unlocks "She is listening"
 * - `thinking` / `speaking` — active conversation states
 * - `lost`     — terminal; the session is torn down
 */
export type AgentReadiness = 'pending' | 'ready' | 'thinking' | 'speaking' | 'lost';

const READINESS: Record<AgentState, AgentReadiness> = {
  // Not ready yet. The agent is present but cannot hear anyone.
  connecting: 'pending',
  'pre-connect-buffering': 'pending',
  initializing: 'pending',
  idle: 'pending',

  // Ready.
  listening: 'ready',
  thinking: 'thinking',
  speaking: 'speaking',

  // Terminal.
  disconnected: 'lost',
  failed: 'lost',
};

export function isDocumentedAgentState(value: string): value is AgentState {
  return (DOCUMENTED_AGENT_STATES as readonly string[]).includes(value);
}

/**
 * Maps a raw attribute value to what the widget should do.
 *
 * `null` means the agent participant is absent — treated as `pending` while we
 * wait for it to appear, with the caller's timeout deciding when to give up.
 * An unrecognised string is also `pending`: fail closed, never `ready`.
 */
export function readinessFor(raw: string | null | undefined): AgentReadiness {
  if (raw === null || raw === undefined) return 'pending';
  const value = raw.trim();
  if (!isDocumentedAgentState(value)) return 'pending';
  return READINESS[value];
}

/**
 * True once the agent has told us it can hear the visitor. The single gate on
 * showing "She is listening".
 */
export function isReadyState(raw: string | null | undefined): boolean {
  const readiness = readinessFor(raw);
  return readiness === 'ready' || readiness === 'thinking' || readiness === 'speaking';
}
