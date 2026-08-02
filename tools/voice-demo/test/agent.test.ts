/**
 * The readiness vocabulary. Every value asserted here is documented; the
 * point of the module is that nothing else can ever read as "ready".
 */

import { describe, expect, it } from 'vitest';
import {
  AGENT_STATE_ATTRIBUTE,
  DOCUMENTED_AGENT_STATES,
  isDocumentedAgentState,
  isReadyState,
  readinessFor,
} from '../src/agent';

describe('documented vocabulary', () => {
  it('uses the documented participant attribute key', () => {
    expect(AGENT_STATE_ATTRIBUTE).toBe('lk.agent.state');
  });

  it('covers exactly the documented state set', () => {
    expect([...DOCUMENTED_AGENT_STATES].sort()).toEqual(
      [
        'connecting',
        'disconnected',
        'failed',
        'idle',
        'initializing',
        'listening',
        'pre-connect-buffering',
        'speaking',
        'thinking',
      ].sort(),
    );
  });

  it('recognises each documented value and nothing else', () => {
    for (const state of DOCUMENTED_AGENT_STATES) {
      expect(isDocumentedAgentState(state), state).toBe(true);
    }
    for (const invented of ['ready', 'canListen', 'active', 'online', '']) {
      expect(isDocumentedAgentState(invented), invented).toBe(false);
    }
  });
});

describe('readiness mapping', () => {
  it('treats every pre-ready state as pending', () => {
    for (const pending of ['connecting', 'pre-connect-buffering', 'initializing', 'idle']) {
      expect(readinessFor(pending), pending).toBe('pending');
    }
  });

  it('maps the three conversational states', () => {
    expect(readinessFor('listening')).toBe('ready');
    expect(readinessFor('thinking')).toBe('thinking');
    expect(readinessFor('speaking')).toBe('speaking');
  });

  it('maps both terminal states to lost', () => {
    expect(readinessFor('disconnected')).toBe('lost');
    expect(readinessFor('failed')).toBe('lost');
  });

  it('an absent agent is pending, never ready', () => {
    expect(readinessFor(null)).toBe('pending');
    expect(readinessFor(undefined)).toBe('pending');
  });

  it('fails CLOSED on anything undocumented', () => {
    // A future SDK value must not be able to claim the secretary is listening.
    // Case matters: only the exact documented spelling counts. (Surrounding
    // whitespace is trimmed — see the test below.)
    for (const unknown of ['canListen', 'READY', 'Listening', 'active', 'x', '']) {
      expect(readinessFor(unknown), unknown).toBe('pending');
      expect(isReadyState(unknown), unknown).toBe(false);
    }
  });

  it('tolerates surrounding whitespace on a documented value', () => {
    expect(readinessFor('  listening  ')).toBe('ready');
  });
});

describe('isReadyState is the single gate on "She is listening"', () => {
  it('is true only for listening, thinking and speaking', () => {
    const ready = DOCUMENTED_AGENT_STATES.filter((state) => isReadyState(state));
    expect([...ready].sort()).toEqual(['listening', 'speaking', 'thinking']);
  });

  it('is false for every pending and terminal state', () => {
    for (const notReady of [
      'connecting',
      'pre-connect-buffering',
      'initializing',
      'idle',
      'disconnected',
      'failed',
      null,
      undefined,
    ]) {
      expect(isReadyState(notReady as string | null), String(notReady)).toBe(false);
    }
  });
});
