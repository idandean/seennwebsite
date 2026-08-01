import { describe, expect, it } from 'vitest';
import {
  ContractViolation,
  canonicalizeLanguage,
  isSecureWebSocketUrl,
  looksLikeServerSecret,
  normalizeRecording,
  normalizeSession,
  parseRecording,
  readErrorCode,
} from '../src/contract';

const NOW = Date.parse('2026-08-01T10:00:00Z');
const FUTURE = '2026-08-01T10:05:00Z';
const PAST = '2026-08-01T09:55:00Z';

const COMPLETE = {
  token: 'jwt-token',
  livekit_url: 'wss://example.livekit.cloud',
  session_id: 'demo-abc',
  expires_at: FUTURE,
  language: 'he',
};

const at = { now: NOW };

function problemsOf(body: unknown): string[] {
  try {
    normalizeSession(body, at);
    return [];
  } catch (error) {
    return [...(error as ContractViolation).problems];
  }
}

describe('normalizeSession — happy path', () => {
  it('accepts the preferred field names', () => {
    expect(normalizeSession(COMPLETE, at)).toEqual({
      token: 'jwt-token',
      livekitUrl: 'wss://example.livekit.cloud',
      sessionId: 'demo-abc',
      expiresAt: FUTURE,
      language: 'he',
    });
  });

  it('still accepts documented aliases', () => {
    const session = normalizeSession(
      {
        participant_token: 'jwt-token',
        url: 'wss://example.livekit.cloud',
        room_name: 'demo-abc',
        expiry: FUTURE,
        resolved_language: 'ar-EG',
      },
      at,
    );
    expect(session.token).toBe('jwt-token');
    expect(session.sessionId).toBe('demo-abc');
    expect(session.language).toBe('ar');
  });
});

describe('livekit_url must be wss://', () => {
  it('rejects ws:// — that would put the token on the wire in clear', () => {
    expect(problemsOf({ ...COMPLETE, livekit_url: 'ws://example.livekit.cloud' })).toContain(
      'livekit_url must be a wss:// URL',
    );
  });

  it('rejects http and https', () => {
    for (const url of ['http://example.com', 'https://example.com']) {
      expect(problemsOf({ ...COMPLETE, livekit_url: url }), url).toContain(
        'livekit_url must be a wss:// URL',
      );
    }
  });

  it('rejects a non-URL', () => {
    expect(problemsOf({ ...COMPLETE, livekit_url: 'not a url' })).toContain(
      'livekit_url must be a wss:// URL',
    );
  });

  it('isSecureWebSocketUrl is exact', () => {
    expect(isSecureWebSocketUrl('wss://a.b')).toBe(true);
    expect(isSecureWebSocketUrl('ws://a.b')).toBe(false);
    expect(isSecureWebSocketUrl('')).toBe(false);
  });
});

describe('expires_at must be a valid future timestamp', () => {
  it('rejects an expiry already in the past', () => {
    expect(problemsOf({ ...COMPLETE, expires_at: PAST })).toContain(
      'expires_at is already in the past',
    );
  });

  it('rejects an expiry exactly now', () => {
    expect(problemsOf({ ...COMPLETE, expires_at: '2026-08-01T10:00:00Z' })).toContain(
      'expires_at is already in the past',
    );
  });

  it('rejects an unparseable timestamp', () => {
    expect(problemsOf({ ...COMPLETE, expires_at: 'soon' })).toContain(
      'expires_at is not a valid ISO-8601 timestamp',
    );
  });

  it('accepts a future one', () => {
    expect(problemsOf(COMPLETE)).toEqual([]);
  });
});

describe('language must canonicalize to en/he/ar', () => {
  it('folds region subtags and the legacy Hebrew code', () => {
    expect(canonicalizeLanguage('he-IL')).toBe('he');
    expect(canonicalizeLanguage('iw')).toBe('he');
    expect(canonicalizeLanguage('ar-EG')).toBe('ar');
    expect(canonicalizeLanguage('en_GB')).toBe('en');
    expect(canonicalizeLanguage('EN')).toBe('en');
  });

  it('returns null for anything else', () => {
    for (const value of ['fr', 'de', 'zh-CN', '', undefined]) {
      expect(canonicalizeLanguage(value), String(value)).toBeNull();
    }
  });

  it('rejects a session in a language the widget cannot render', () => {
    expect(problemsOf({ ...COMPLETE, language: 'fr' })).toContain(
      'language "fr" is not one of en, he, ar',
    );
  });

  it('normalizes the stored value', () => {
    expect(normalizeSession({ ...COMPLETE, language: 'he-IL' }, at).language).toBe('he');
  });
});

describe('token and session id must be non-empty', () => {
  it('rejects empty and whitespace-only values', () => {
    expect(problemsOf({ ...COMPLETE, token: '' })).toContain('missing token');
    expect(problemsOf({ ...COMPLETE, token: '   ' })).toContain('missing token');
    expect(problemsOf({ ...COMPLETE, session_id: '  ' })).toContain('missing session_id');
  });

  it('lists every problem at once, not just the first', () => {
    const problems = problemsOf({ livekit_url: 'ws://x.y' });
    expect(problems).toEqual([
      'missing token',
      'livekit_url must be a wss:// URL',
      'missing session_id',
      'missing expires_at',
      'missing language',
    ]);
  });

  it('rejects a non-object body', () => {
    for (const body of [null, 'oops', 42, ['a']]) {
      expect(() => normalizeSession(body, at)).toThrow(ContractViolation);
    }
  });
});

describe('recording — v1 is not recorded, so this fails closed', () => {
  const consent = {
    required: true,
    text: 'This call is recorded.',
    policy_version: 'rec-1',
    locale: 'en',
  };

  it('rejects a usable token arriving with recording.required=true', () => {
    expect(problemsOf({ ...COMPLETE, recording: consent })).toContain(
      'response carries a usable token together with recording.required=true',
    );
  });

  it('rejects a token arriving with a malformed required recording block', () => {
    const problems = problemsOf({ ...COMPLETE, recording: { required: true } });
    expect(problems).toContain('recording block has no consent text');
    expect(problems).toContain(
      'response carries a usable token together with a required recording block',
    );
  });

  it('a required block with no policy version is malformed', () => {
    const parsed = parseRecording({ required: true, text: 'Recorded.' });
    expect(parsed.status).toBe('malformed');
    if (parsed.status === 'malformed') {
      expect(parsed.required).toBe(true);
      expect(parsed.reason).toMatch(/policy version/);
    }
  });

  it('allows an informational, non-required block alongside a token', () => {
    const session = normalizeSession(
      { ...COMPLETE, recording: { ...consent, required: false } },
      at,
    );
    expect(session.recording?.required).toBe(false);
  });

  it('treats an absent block as absent', () => {
    expect(parseRecording(undefined).status).toBe('absent');
    expect(parseRecording({}).status).toBe('absent');
  });
});

describe('policy_url must be http(s)', () => {
  const base = { required: true, text: 'Recorded.', policy_version: 'rec-1', locale: 'en' };

  it('accepts http and https', () => {
    for (const url of ['http://a.b/p', 'https://a.b/p']) {
      const parsed = parseRecording({ ...base, policy_url: url });
      expect(parsed.status, url).toBe('ok');
    }
  });

  it('rejects javascript:, data: and other schemes as malformed', () => {
    for (const url of ['javascript:alert(1)', 'data:text/html,x', 'ftp://a.b', 'not-a-url']) {
      const parsed = parseRecording({ ...base, policy_url: url });
      expect(parsed.status, url).toBe('malformed');
      if (parsed.status === 'malformed') expect(parsed.reason).toMatch(/policy_url/);
    }
  });

  it('normalizeRecording drops anything unusable', () => {
    expect(normalizeRecording({ ...base, policy_url: 'javascript:alert(1)' })).toBeUndefined();
  });
});

describe('readErrorCode', () => {
  it('reads known codes from any plausible field name', () => {
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
    expect(readErrorCode({ error: 'brand_new' }, 429)).toBe('rate_limited');
    expect(readErrorCode({ error: 'brand_new' }, 503)).toBe('demo_unavailable');
    expect(readErrorCode({ error: 'brand_new' }, 400)).toBe('invalid_request');
    expect(readErrorCode(null, 500)).toBe('server_error');
  });
});

describe('looksLikeServerSecret', () => {
  it('catches a legacy service-role JWT', () => {
    const payload = btoa(JSON.stringify({ role: 'service_role' }));
    expect(looksLikeServerSecret(`eyJhbGciOiJIUzI1NiJ9.${payload}.sig`)).toBe(true);
  });

  it('catches modern sb_secret_ keys', () => {
    expect(looksLikeServerSecret('sb_secret_AbCdEf123456')).toBe(true);
    expect(looksLikeServerSecret('SB_SECRET_AbCdEf123456')).toBe(true);
    expect(looksLikeServerSecret('  sb_secret_x  ')).toBe(true);
  });

  it('allows sb_publishable_ keys, which are browser-safe', () => {
    expect(looksLikeServerSecret('sb_publishable_AbCdEf123456')).toBe(false);
  });

  it('allows a legacy anon JWT', () => {
    const payload = btoa(JSON.stringify({ role: 'anon' }));
    expect(looksLikeServerSecret(`eyJhbGciOiJIUzI1NiJ9.${payload}.sig`)).toBe(false);
  });

  it('catches obviously-named secrets', () => {
    expect(looksLikeServerSecret('LIVEKIT_API_SECRET=abc')).toBe(true);
    expect(looksLikeServerSecret('sk_live_abc123')).toBe(true);
    expect(looksLikeServerSecret('SUPABASE_SERVICE_ROLE_KEY')).toBe(true);
  });

  it('is quiet on empty input', () => {
    expect(looksLikeServerSecret('')).toBe(false);
  });
});
