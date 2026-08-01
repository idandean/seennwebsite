import { describe, expect, it } from 'vitest';
import { initialContext, isActive, reduce } from '../src/state';
import type { DemoContext, DemoEvent, DemoState } from '../src/state';
import type { DemoSession, RecordingConsent } from '../src/contract';

const SESSION: DemoSession = {
  token: 'jwt',
  livekitUrl: 'wss://example.livekit.cloud',
  sessionId: 'demo-1',
  expiresAt: '2030-01-01T00:00:00Z',
  language: 'en',
};

const CONSENT: RecordingConsent = {
  required: true,
  text: 'This call is recorded.',
  policyVersion: 'rec-2026-01',
  locale: 'en',
};

/** Drives the machine through the happy path up to the requested state. */
function at(state: DemoState): DemoContext {
  let ctx = initialContext(null);
  const path: DemoEvent[] = [
    { type: 'START' },
    { type: 'MIC_GRANTED' },
    { type: 'SESSION_GRANTED', session: SESSION },
    { type: 'CONNECTED' },
  ];
  if (state === 'ready') return ctx;
  for (const event of path) {
    ctx = reduce(ctx, event);
    if (ctx.state === state) return ctx;
  }
  if (state === 'assistantSpeaking') return reduce(ctx, { type: 'ASSISTANT_SPEAKING_START' });
  if (state === 'reconnecting') return reduce(ctx, { type: 'RECONNECTING' });
  if (state === 'finished') return reduce(ctx, { type: 'DISCONNECT', reason: 'user_disconnected' });
  if (state === 'error') return reduce(ctx, { type: 'ERROR', code: 'server_error' });
  return ctx;
}

describe('initial state', () => {
  it('starts unavailable when a reason is supplied', () => {
    expect(initialContext('flag_disabled').state).toBe('unavailable');
  });

  it('starts ready when nothing blocks it', () => {
    expect(initialContext(null).state).toBe('ready');
  });
});

describe('happy path', () => {
  it('walks ready → requestingMicrophone → connecting → listening', () => {
    let ctx = initialContext(null);
    expect(ctx.state).toBe('ready');

    ctx = reduce(ctx, { type: 'START' });
    expect(ctx.state).toBe('requestingMicrophone');
    expect(ctx.connectionInFlight).toBe(true);

    ctx = reduce(ctx, { type: 'MIC_GRANTED' });
    expect(ctx.state).toBe('connecting');

    ctx = reduce(ctx, { type: 'SESSION_GRANTED', session: SESSION });
    expect(ctx.session).toEqual(SESSION);

    ctx = reduce(ctx, { type: 'CONNECTED' });
    expect(ctx.state).toBe('listening');
  });

  it('toggles listening ⇄ assistantSpeaking', () => {
    let ctx = at('listening');
    ctx = reduce(ctx, { type: 'ASSISTANT_SPEAKING_START' });
    expect(ctx.state).toBe('assistantSpeaking');
    ctx = reduce(ctx, { type: 'ASSISTANT_SPEAKING_END' });
    expect(ctx.state).toBe('listening');
  });

  it('reconnects from either live state and returns to listening', () => {
    for (const from of ['listening', 'assistantSpeaking'] as const) {
      let ctx = at(from);
      ctx = reduce(ctx, { type: 'RECONNECTING' });
      expect(ctx.state).toBe('reconnecting');
      ctx = reduce(ctx, { type: 'RECONNECTED' });
      expect(ctx.state).toBe('listening');
    }
  });

  it('finishes and records why', () => {
    const ctx = reduce(at('listening'), { type: 'DISCONNECT', reason: 'session_expired' });
    expect(ctx.state).toBe('finished');
    expect(ctx.finishReason).toBe('session_expired');
    expect(ctx.session).toBeNull();
    expect(ctx.connectionInFlight).toBe(false);
  });
});

describe('duplicate session prevention', () => {
  it('rejects a second START while a connection is in flight', () => {
    const first = reduce(initialContext(null), { type: 'START' });
    const second = reduce(first, { type: 'START' });
    // Identity, not equality: a rejected transition returns the same object.
    expect(second).toBe(first);
    expect(second.attempt).toBe(1);
  });

  it('rejects START from every mid-flight state', () => {
    for (const state of ['requestingMicrophone', 'connecting', 'listening', 'assistantSpeaking', 'reconnecting'] as const) {
      const ctx = at(state);
      expect(reduce(ctx, { type: 'START' })).toBe(ctx);
    }
  });

  it('allows a fresh START once finished, and bumps the attempt counter', () => {
    const finished = at('finished');
    const restarted = reduce(finished, { type: 'START' });
    expect(restarted.state).toBe('requestingMicrophone');
    expect(restarted.attempt).toBe(finished.attempt + 1);
  });

  it('allows retry from error and rateLimited', () => {
    for (const ctx of [at('error'), reduce(reduce(initialContext(null), { type: 'START' }), { type: 'RATE_LIMITED', scope: 'per_visitor' })]) {
      expect(reduce(ctx, { type: 'START' }).state).toBe('requestingMicrophone');
    }
  });
});

describe('microphone denial', () => {
  it('lands in error with a dedicated code and drops the in-flight flag', () => {
    const ctx = reduce(at('requestingMicrophone'), { type: 'MIC_DENIED' });
    expect(ctx.state).toBe('error');
    expect(ctx.errorCode).toBe('microphone_denied');
    expect(ctx.connectionInFlight).toBe(false);
  });

  it('distinguishes an unavailable device from a refused one', () => {
    const ctx = reduce(at('requestingMicrophone'), { type: 'MIC_UNAVAILABLE' });
    expect(ctx.errorCode).toBe('microphone_unavailable');
  });

  it('ignores a denial that arrives after the state moved on', () => {
    const connecting = at('connecting');
    expect(reduce(connecting, { type: 'MIC_DENIED' })).toBe(connecting);
  });
});

describe('rate limiting', () => {
  it('separates a per-visitor limit from a global capacity ceiling', () => {
    for (const scope of ['per_visitor', 'global_capacity'] as const) {
      const ctx = reduce(at('connecting'), { type: 'RATE_LIMITED', scope });
      expect(ctx.state).toBe('rateLimited');
      expect(ctx.rateLimitScope).toBe(scope);
      expect(ctx.connectionInFlight).toBe(false);
    }
  });
});

describe('consent', () => {
  it('is collected during connecting without adding an eleventh state', () => {
    const ctx = reduce(at('connecting'), { type: 'CONSENT_REQUIRED', consent: CONSENT });
    expect(ctx.state).toBe('connecting');
    expect(ctx.pendingConsent).toEqual(CONSENT);
  });

  it('records the accepted policy version and locale', () => {
    let ctx = reduce(at('connecting'), { type: 'CONSENT_REQUIRED', consent: CONSENT });
    ctx = reduce(ctx, { type: 'CONSENT_ACCEPTED', acceptedAt: '2026-08-01T10:00:00.000Z' });
    expect(ctx.pendingConsent).toBeNull();
    expect(ctx.acceptedConsent).toEqual({
      policyVersion: 'rec-2026-01',
      locale: 'en',
      acceptedAt: '2026-08-01T10:00:00.000Z',
    });
  });

  it('declining finishes the session rather than erroring', () => {
    let ctx = reduce(at('connecting'), { type: 'CONSENT_REQUIRED', consent: CONSENT });
    ctx = reduce(ctx, { type: 'CONSENT_DECLINED' });
    expect(ctx.state).toBe('finished');
    expect(ctx.connectionInFlight).toBe(false);
  });

  it('carries an acceptance across a retry so the visitor is not asked twice', () => {
    let ctx = reduce(at('connecting'), { type: 'CONSENT_REQUIRED', consent: CONSENT });
    ctx = reduce(ctx, { type: 'CONSENT_ACCEPTED', acceptedAt: '2026-08-01T10:00:00.000Z' });
    ctx = reduce(ctx, { type: 'ERROR', code: 'transport_failed' });
    ctx = reduce(ctx, { type: 'START' });
    expect(ctx.acceptedConsent?.policyVersion).toBe('rec-2026-01');
  });

  it('cannot be accepted when nothing is pending', () => {
    const ctx = at('connecting');
    expect(reduce(ctx, { type: 'CONSENT_ACCEPTED', acceptedAt: 'x' })).toBe(ctx);
  });
});

describe('feature flag transitions', () => {
  it('FLAG_DISABLED drops any state to unavailable', () => {
    const ctx = reduce(at('listening'), { type: 'FLAG_DISABLED', reason: 'flag_disabled' });
    expect(ctx.state).toBe('unavailable');
    expect(ctx.unavailableReason).toBe('flag_disabled');
  });

  it('FLAG_ENABLED lifts unavailable to ready', () => {
    const ctx = reduce(initialContext('flag_disabled'), { type: 'FLAG_ENABLED' });
    expect(ctx.state).toBe('ready');
    expect(ctx.unavailableReason).toBeNull();
  });

  it('refuses to start while unavailable', () => {
    const ctx = initialContext('flag_disabled');
    expect(reduce(ctx, { type: 'START' })).toBe(ctx);
  });

  it('ignores errors while unavailable', () => {
    const ctx = initialContext('flag_disabled');
    expect(reduce(ctx, { type: 'ERROR', code: 'server_error' })).toBe(ctx);
  });
});

describe('rejected transitions', () => {
  it('returns the identical context for every illegal pairing', () => {
    const illegal: Array<[DemoState, DemoEvent]> = [
      ['ready', { type: 'CONNECTED' }],
      ['ready', { type: 'MIC_GRANTED' }],
      ['ready', { type: 'RECONNECTING' }],
      ['connecting', { type: 'ASSISTANT_SPEAKING_START' }],
      ['listening', { type: 'ASSISTANT_SPEAKING_END' }],
      ['assistantSpeaking', { type: 'ASSISTANT_SPEAKING_START' }],
      ['reconnecting', { type: 'CONNECTED' }],
      ['finished', { type: 'DISCONNECT', reason: 'user_disconnected' }],
      ['finished', { type: 'RECONNECTED' }],
    ];

    for (const [state, event] of illegal) {
      const ctx = at(state);
      expect(reduce(ctx, event), `${state} + ${event.type}`).toBe(ctx);
    }
  });
});

describe('isActive', () => {
  it('covers exactly the states that hold resources', () => {
    const holding: DemoState[] = ['connecting', 'listening', 'assistantSpeaking', 'reconnecting'];
    const idle: DemoState[] = [
      'unavailable',
      'ready',
      'requestingMicrophone',
      'finished',
      'rateLimited',
      'error',
    ];
    expect(holding.every(isActive)).toBe(true);
    expect(idle.some(isActive)).toBe(false);
  });
});
