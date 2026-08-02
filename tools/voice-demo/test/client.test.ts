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

const NOW = Date.parse('2026-08-01T10:00:00Z');

function makeClient(fetchImpl: typeof fetch, requireTurnstileToken = false) {
  return new PublicVoiceDemoClient({
    baseUrl: 'https://stub.supabase.co/',
    anonKey: 'anon-key-123',
    path: '/functions/v1/public-voice-demo',
    requireTurnstileToken,
    fetchImpl,
    now: () => NOW,
  });
}

/** Every call in this suite carries a token, as the widget always does. */
const INPUT = { turnstileToken: 'ts-token-1' };

const SESSION_BODY = {
  token: 'jwt',
  livekit_url: 'wss://x.livekit.cloud',
  session_id: 'demo-1',
  expires_at: '2026-08-01T10:05:00Z',
  language: 'en',
};

describe('request shape', () => {
  it('POSTs to the public endpoint, not the authenticated one', async () => {
    const { impl, calls } = stubFetch({ status: 200, body: SESSION_BODY });
    await makeClient(impl).createSession(INPUT);

    expect(calls[0]!.url).toBe('https://stub.supabase.co/functions/v1/public-voice-demo');
    expect(calls[0]!.url).not.toContain('ar-preview-call');
  });

  it('sends the anon key and no user token', async () => {
    const { impl, calls } = stubFetch({ status: 200, body: SESSION_BODY });
    await makeClient(impl).createSession(INPUT);

    const headers = calls[0]!.init.headers as Record<string, string>;
    expect(headers['apikey']).toBe('anon-key-123');
    expect(headers['Authorization']).toBeUndefined();
    expect(headers['authorization']).toBeUndefined();
  });

  it('sends NO language — automatic is the default and only behaviour', async () => {
    const { impl, calls } = stubFetch({ status: 200, body: SESSION_BODY });
    await makeClient(impl).createSession(INPUT);
    const body = JSON.parse(calls[0]!.init.body as string);
    expect(Object.prototype.hasOwnProperty.call(body, 'language')).toBe(false);
  });

  it('sends exactly turnstile_token in automatic mode', async () => {
    const { impl, calls } = stubFetch({ status: 200, body: SESSION_BODY });
    await makeClient(impl).createSession(INPUT);

    const body = JSON.parse(calls[0]!.init.body as string);
    expect(Object.keys(body).sort()).toEqual(['turnstile_token']);
    expect(body.turnstile_token).toBe('ts-token-1');
  });

  it('never sends a phone number, tenant, amount or balance_month', async () => {
    const { impl, calls } = stubFetch({ status: 200, body: SESSION_BODY });
    await makeClient(impl).createSession(INPUT);

    const body = JSON.parse(calls[0]!.init.body as string);
    for (const forbidden of ['destination_phone', 'tenant_id', 'amount', 'balance_month']) {
      expect(body, forbidden).not.toHaveProperty(forbidden);
    }
  });

  it('includes consent only once accepted, in snake_case', async () => {
    const { impl, calls } = stubFetch({ status: 200, body: SESSION_BODY });
    await makeClient(impl).createSession({
      turnstileToken: 'ts-token-1',
      consent: { policyVersion: 'rec-1', locale: 'he', acceptedAt: '2026-08-01T10:00:00.000Z' },
    });

    expect(JSON.parse(calls[0]!.init.body as string).consent).toEqual({
      policy_version: 'rec-1',
      locale: 'he',
      accepted_at: '2026-08-01T10:00:00.000Z',
    });
  });

  it('omits turnstile_token entirely when there is none', async () => {
    const { impl, calls } = stubFetch({ status: 200, body: SESSION_BODY });
    await makeClient(impl).createSession({});
    expect(JSON.parse(calls[0]!.init.body as string)).not.toHaveProperty('turnstile_token');
  });

  it('REFUSES to send at all when a token is required but absent', async () => {
    const { impl, calls } = stubFetch({ status: 200, body: SESSION_BODY });

    await expect(
      makeClient(impl, true).createSession({}),
    ).rejects.toMatchObject({ code: 'verification_failed' });

    // The point: nothing went out. Not a request without a token — no request.
    expect(calls).toHaveLength(0);
  });

  it('treats a blank token as absent', async () => {
    const { impl, calls } = stubFetch({ status: 200, body: SESSION_BODY });
    await expect(
      makeClient(impl, true).createSession({ turnstileToken: '   ' }),
    ).rejects.toMatchObject({ code: 'verification_failed' });
    expect(calls).toHaveLength(0);
  });
});

describe('responses', () => {
  it('returns a normalized session', async () => {
    const { impl } = stubFetch({ status: 200, body: SESSION_BODY });
    const result = await makeClient(impl).createSession(INPUT);
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
    const result = await makeClient(impl).createSession(INPUT);
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
    const result = await makeClient(impl).createSession(INPUT);
    expect(result.kind).toBe('consent_required');
  });

  it('rejects a token arriving together with recording.required — v1 is not recorded', async () => {
    const { impl } = stubFetch({
      status: 200,
      body: {
        ...SESSION_BODY,
        recording: { required: true, text: 'Recorded.', policy_version: 'rec-1', locale: 'en' },
      },
    });
    await expect(makeClient(impl).createSession(INPUT)).rejects.toMatchObject({
      code: 'contract_violation',
    });
  });

  it('fails closed when consent is demanded but unrenderable', async () => {
    const { impl } = stubFetch({
      status: 428,
      body: { error: 'consent_required', recording: { required: true } },
    });
    await expect(makeClient(impl).createSession(INPUT)).rejects.toMatchObject({
      code: 'contract_violation',
    });
  });

  it('rejects a response whose expiry is already past', async () => {
    const { impl } = stubFetch({
      status: 200,
      body: { ...SESSION_BODY, expires_at: '2026-08-01T09:00:00Z' },
    });
    await expect(makeClient(impl).createSession(INPUT)).rejects.toMatchObject({
      code: 'contract_violation',
    });
  });

  it('rejects a non-wss livekit_url', async () => {
    const { impl } = stubFetch({
      status: 200,
      body: { ...SESSION_BODY, livekit_url: 'ws://x.livekit.cloud' },
    });
    await expect(makeClient(impl).createSession(INPUT)).rejects.toMatchObject({
      code: 'contract_violation',
    });
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
      await expect(makeClient(impl).createSession(INPUT)).rejects.toMatchObject({
        code: expected,
      });
    }
  });

  it('reports a contract violation distinctly from a server error', async () => {
    const { impl } = stubFetch({ status: 200, body: { token: 'only-a-token' } });
    await expect(makeClient(impl).createSession(INPUT)).rejects.toMatchObject({
      code: 'contract_violation',
    });
  });

  it('reports a network failure without inventing a server code', async () => {
    const impl = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;

    await expect(makeClient(impl).createSession(INPUT)).rejects.toMatchObject({
      code: 'network_error',
    });
  });

  it('carries Retry-After when the server sends one', async () => {
    const { impl } = stubFetch({
      status: 429,
      body: { error: 'rate_limited' },
      headers: { 'retry-after': '90' },
    });
    await expect(makeClient(impl).createSession(INPUT)).rejects.toMatchObject({
      retryAfterSeconds: 90,
    });
  });

  it('parses an HTTP-date Retry-After too', async () => {
    const { impl } = stubFetch({
      status: 429,
      body: { error: 'rate_limited' },
      headers: { 'retry-after': new Date(Date.now() + 60_000).toUTCString() },
    });
    await makeClient(impl)
      .createSession(INPUT)
      .catch((error: DemoRequestError) => {
        expect(error.retryAfterSeconds).toBeGreaterThan(50);
        expect(error.retryAfterSeconds).toBeLessThanOrEqual(60);
      });
  });

  it('lets an abort propagate rather than reporting it as a network error', async () => {
    const impl = vi.fn(async () => {
      const error = new Error('aborted');
      error.name = 'AbortError';
      throw error;
    }) as unknown as typeof fetch;

    await expect(makeClient(impl).createSession(INPUT)).rejects.toMatchObject({
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
