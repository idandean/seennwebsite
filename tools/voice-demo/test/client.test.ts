import { describe, expect, it, vi } from 'vitest';
import { DemoRequestError, PublicVoiceDemoClient, rateLimitScopeFor } from '../src/client';

interface StubResponse {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

function stubFetch(...responses: StubResponse[]) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  let index = 0;

  const impl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    const next = responses[Math.min(index, responses.length - 1)]!;
    index += 1;
    return {
      ok: next.status >= 200 && next.status < 300,
      status: next.status,
      headers: { get: (name: string) => next.headers?.[name.toLowerCase()] ?? null },
      json: async () => next.body,
    } as unknown as Response;
  });

  return { impl: impl as unknown as typeof fetch, calls };
}

function makeClient(fetchImpl: typeof fetch) {
  return new PublicVoiceDemoClient({
    baseUrl: 'https://stub.supabase.co/',
    anonKey: 'anon-key-123',
    path: '/functions/v1/public-voice-demo',
    fetchImpl,
  });
}

const SESSION_BODY = {
  token: 'jwt',
  livekit_url: 'wss://x.livekit.cloud',
  session_id: 'demo-1',
  expires_at: '2030-01-01T00:00:00Z',
  language: 'en',
};

describe('request shape', () => {
  it('POSTs to the public endpoint, not the authenticated one', async () => {
    const { impl, calls } = stubFetch({ status: 200, body: SESSION_BODY });
    await makeClient(impl).createSession({ locale: 'en' });

    expect(calls[0]!.url).toBe('https://stub.supabase.co/functions/v1/public-voice-demo');
    expect(calls[0]!.url).not.toContain('ar-preview-call');
  });

  it('sends the anon key and no user token', async () => {
    const { impl, calls } = stubFetch({ status: 200, body: SESSION_BODY });
    await makeClient(impl).createSession({ locale: 'en' });

    const headers = calls[0]!.init.headers as Record<string, string>;
    expect(headers['apikey']).toBe('anon-key-123');
    expect(headers['Authorization']).toBeUndefined();
    expect(headers['authorization']).toBeUndefined();
  });

  it('sends the website locale', async () => {
    for (const locale of ['en', 'he', 'ar'] as const) {
      const { impl, calls } = stubFetch({ status: 200, body: SESSION_BODY });
      await makeClient(impl).createSession({ locale });
      expect(JSON.parse(calls[0]!.init.body as string).language).toBe(locale);
    }
  });

  it('never sends a phone number or tenant, whatever else happens', async () => {
    const { impl, calls } = stubFetch({ status: 200, body: SESSION_BODY });
    await makeClient(impl).createSession({ locale: 'en' });

    const body = JSON.parse(calls[0]!.init.body as string);
    expect(Object.keys(body)).toEqual(['language']);
    expect(body).not.toHaveProperty('destination_phone');
    expect(body).not.toHaveProperty('tenant_id');
  });

  it('includes consent only once accepted, in snake_case', async () => {
    const { impl, calls } = stubFetch({ status: 200, body: SESSION_BODY });
    await makeClient(impl).createSession({
      locale: 'he',
      consent: { policyVersion: 'rec-1', locale: 'he', acceptedAt: '2026-08-01T10:00:00.000Z' },
    });

    expect(JSON.parse(calls[0]!.init.body as string).consent).toEqual({
      policy_version: 'rec-1',
      locale: 'he',
      accepted_at: '2026-08-01T10:00:00.000Z',
    });
  });

  it('omits the turnstile token when none is configured', async () => {
    const { impl, calls } = stubFetch({ status: 200, body: SESSION_BODY });
    await makeClient(impl).createSession({ locale: 'en' });
    expect(JSON.parse(calls[0]!.init.body as string)).not.toHaveProperty('turnstile_token');
  });
});

describe('responses', () => {
  it('returns a normalized session', async () => {
    const { impl } = stubFetch({ status: 200, body: SESSION_BODY });
    const result = await makeClient(impl).createSession({ locale: 'en' });
    expect(result.kind).toBe('session');
    if (result.kind === 'session') expect(result.session.sessionId).toBe('demo-1');
  });

  it('surfaces a consent demand returned as a 4xx', async () => {
    const { impl } = stubFetch({
      status: 428,
      body: {
        error: 'consent_required',
        recording: { required: true, text: 'Recorded.', policy_version: 'rec-1', locale: 'en' },
      },
    });
    const result = await makeClient(impl).createSession({ locale: 'en' });
    expect(result.kind).toBe('consent_required');
    if (result.kind === 'consent_required') {
      expect(result.consent.text).toBe('Recorded.');
      expect(result.consent.policyVersion).toBe('rec-1');
    }
  });

  it('surfaces a consent demand returned as a token-less 200', async () => {
    const { impl } = stubFetch({
      status: 200,
      body: {
        recording: { required: true, text: 'Recorded.', policy_version: 'rec-1', locale: 'en' },
      },
    });
    const result = await makeClient(impl).createSession({ locale: 'en' });
    expect(result.kind).toBe('consent_required');
  });

  it('treats a session that carries a token as a session, consent block or not', async () => {
    const { impl } = stubFetch({
      status: 200,
      body: {
        ...SESSION_BODY,
        recording: { required: true, text: 'Recorded.', policy_version: 'rec-1', locale: 'en' },
      },
    });
    const result = await makeClient(impl).createSession({ locale: 'en' });
    expect(result.kind).toBe('session');
  });
});

describe('errors', () => {
  it('maps the documented codes', async () => {
    const cases: Array<[number, string, string]> = [
      [503, 'demo_disabled', 'demo_disabled'],
      [503, 'demo_unavailable', 'demo_unavailable'],
      [429, 'rate_limited', 'rate_limited'],
      [429, 'demo_capacity_reached', 'demo_capacity_reached'],
      [403, 'verification_failed', 'verification_failed'],
      [500, 'server_error', 'server_error'],
    ];

    for (const [status, error, expected] of cases) {
      const { impl } = stubFetch({ status, body: { error } });
      await expect(makeClient(impl).createSession({ locale: 'en' })).rejects.toMatchObject({
        code: expected,
      });
    }
  });

  it('reports a contract violation distinctly from a server error', async () => {
    const { impl } = stubFetch({ status: 200, body: { token: 'only-a-token' } });
    await expect(makeClient(impl).createSession({ locale: 'en' })).rejects.toMatchObject({
      code: 'contract_violation',
    });
  });

  it('reports a network failure without inventing a server code', async () => {
    const impl = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;

    await expect(makeClient(impl).createSession({ locale: 'en' })).rejects.toMatchObject({
      code: 'network_error',
    });
  });

  it('carries Retry-After when the server sends one', async () => {
    const { impl } = stubFetch({
      status: 429,
      body: { error: 'rate_limited' },
      headers: { 'retry-after': '90' },
    });
    await makeClient(impl)
      .createSession({ locale: 'en' })
      .catch((error: DemoRequestError) => {
        expect(error.retryAfterSeconds).toBe(90);
      });
  });

  it('lets an abort propagate rather than reporting it as a network error', async () => {
    const impl = vi.fn(async () => {
      const error = new Error('aborted');
      error.name = 'AbortError';
      throw error;
    }) as unknown as typeof fetch;

    await expect(makeClient(impl).createSession({ locale: 'en' })).rejects.toMatchObject({
      name: 'AbortError',
    });
  });
});

describe('rateLimitScopeFor', () => {
  it('separates the global ceiling from the per-visitor limit', () => {
    expect(rateLimitScopeFor('demo_capacity_reached')).toBe('global_capacity');
    expect(rateLimitScopeFor('rate_limited')).toBe('per_visitor');
  });
});
