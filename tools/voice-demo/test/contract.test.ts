import { describe, expect, it } from 'vitest';
import {
  ContractViolation,
  looksLikeServerSecret,
  normalizeRecording,
  normalizeSession,
  readErrorCode,
} from '../src/contract';

const COMPLETE = {
  token: 'jwt-token',
  livekit_url: 'wss://example.livekit.cloud',
  session_id: 'demo-abc',
  expires_at: '2030-01-01T00:00:00Z',
  language: 'he',
};

describe('normalizeSession', () => {
  it('accepts the preferred field names', () => {
    expect(normalizeSession(COMPLETE)).toEqual({
      token: 'jwt-token',
      livekitUrl: 'wss://example.livekit.cloud',
      sessionId: 'demo-abc',
      expiresAt: '2030-01-01T00:00:00Z',
      language: 'he',
    });
  });

  it('accepts documented aliases, because the contract is not agreed yet', () => {
    const session = normalizeSession({
      participant_token: 'jwt-token',
      url: 'wss://example.livekit.cloud',
      room_name: 'demo-abc',
      expiry: '2030-01-01T00:00:00Z',
      resolved_language: 'ar',
    });
    expect(session.token).toBe('jwt-token');
    expect(session.sessionId).toBe('demo-abc');
    expect(session.language).toBe('ar');
  });

  it('names every missing required field rather than failing vaguely', () => {
    try {
      normalizeSession({ token: 'x' });
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ContractViolation);
      expect((error as ContractViolation).missing).toEqual([
        'livekit_url',
        'session_id',
        'expires_at',
        'language',
      ]);
    }
  });

  it('rejects an empty string as if it were absent', () => {
    expect(() => normalizeSession({ ...COMPLETE, token: '' })).toThrow(ContractViolation);
  });

  it('rejects a non-object body', () => {
    for (const body of [null, 'oops', 42, ['a']]) {
      expect(() => normalizeSession(body)).toThrow(ContractViolation);
    }
  });

  it('attaches a recording block when one is present', () => {
    const session = normalizeSession({
      ...COMPLETE,
      recording: {
        required: true,
        text: 'This call is recorded for quality.',
        policy_version: 'rec-2026-02',
        locale: 'he',
        policy_url: 'https://www.seenn.ai/privacy-policy.html',
      },
    });
    expect(session.recording).toEqual({
      required: true,
      text: 'This call is recorded for quality.',
      policyVersion: 'rec-2026-02',
      locale: 'he',
      policyUrl: 'https://www.seenn.ai/privacy-policy.html',
    });
  });
});

describe('normalizeRecording', () => {
  it('drops a consent block with no wording — we will not invent it', () => {
    expect(normalizeRecording({ required: true, policy_version: 'v1' })).toBeUndefined();
  });

  it('drops a consent block with no version — an acceptance must be identifiable', () => {
    expect(normalizeRecording({ required: true, text: 'Recorded.' })).toBeUndefined();
  });

  it('defaults `required` to false rather than assuming consent is needed', () => {
    const consent = normalizeRecording({ text: 'Recorded.', policy_version: 'v1' });
    expect(consent?.required).toBe(false);
  });
});

describe('readErrorCode', () => {
  it('reads known codes from any of the plausible field names', () => {
    expect(readErrorCode({ error: 'rate_limited' }, 429)).toBe('rate_limited');
    expect(readErrorCode({ code: 'demo_disabled' }, 503)).toBe('demo_disabled');
    expect(readErrorCode({ error_code: 'verification_failed' }, 403)).toBe('verification_failed');
  });

  it('reads an RFC 7807 type URI', () => {
    expect(readErrorCode({ type: 'https://errors.seenn.ai/demo_capacity_reached' }, 429)).toBe(
      'demo_capacity_reached',
    );
  });

  it('falls back to the status class for an unknown code', () => {
    expect(readErrorCode({ error: 'brand_new_thing' }, 429)).toBe('rate_limited');
    expect(readErrorCode({ error: 'brand_new_thing' }, 503)).toBe('demo_unavailable');
    expect(readErrorCode({ error: 'brand_new_thing' }, 400)).toBe('invalid_request');
    expect(readErrorCode(null, 500)).toBe('server_error');
  });
});

describe('looksLikeServerSecret', () => {
  it('catches a service-role JWT', () => {
    const payload = btoa(JSON.stringify({ role: 'service_role' }));
    expect(looksLikeServerSecret(`eyJhbGciOiJIUzI1NiJ9.${payload}.sig`)).toBe(true);
  });

  it('passes an anon JWT', () => {
    const payload = btoa(JSON.stringify({ role: 'anon' }));
    expect(looksLikeServerSecret(`eyJhbGciOiJIUzI1NiJ9.${payload}.sig`)).toBe(false);
  });

  it('catches obviously-named secrets', () => {
    expect(looksLikeServerSecret('LIVEKIT_API_SECRET=abc')).toBe(true);
    expect(looksLikeServerSecret('sk_live_abc123')).toBe(true);
  });

  it('is quiet on empty input', () => {
    expect(looksLikeServerSecret('')).toBe(false);
  });
});
