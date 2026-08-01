import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TURNSTILE_SCRIPT_URL, TurnstileError, createTurnstileProvider } from '../src/turnstile';

/** A stand-in for the Cloudflare API, recording how it was driven. */
function fakeApi() {
  const calls: string[] = [];
  let callback: ((token: string) => void) | null = null;
  let errorCallback: ((code?: string) => void) | null = null;
  let counter = 0;

  const api = {
    render: vi.fn((_el: HTMLElement, opts: Record<string, unknown>) => {
      calls.push('render');
      callback = opts['callback'] as (token: string) => void;
      errorCallback = opts['error-callback'] as (code?: string) => void;
      return 'widget-1';
    }),
    // Real Turnstile issues a *different* token each execute; mimic that so a
    // reused token would be visible in assertions.
    execute: vi.fn(() => {
      calls.push('execute');
      counter += 1;
      queueMicrotask(() => callback?.(`token-${counter}`));
    }),
    reset: vi.fn(() => calls.push('reset')),
    remove: vi.fn(() => calls.push('remove')),
  };

  return { api, calls, fail: (code?: string) => errorCallback?.(code) };
}

beforeEach(() => {
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  delete (window as { turnstile?: unknown }).turnstile;
});

describe('token freshness', () => {
  it('issues a different token on each call', async () => {
    const { api } = fakeApi();
    const provider = createTurnstileProvider({ siteKey: 'k', loadScript: async () => api });

    expect(await provider.getToken()).toBe('token-1');
    expect(await provider.getToken()).toBe('token-2');
    expect(await provider.getToken()).toBe('token-3');
  });

  it('resets before every execute, so a stale challenge cannot be reused', async () => {
    const { api, calls } = fakeApi();
    const provider = createTurnstileProvider({ siteKey: 'k', loadScript: async () => api });

    await provider.getToken();
    await provider.getToken();

    // render once, then reset→execute per token — never execute without reset.
    expect(calls).toEqual(['render', 'reset', 'execute', 'reset', 'execute']);
  });

  it('renders the widget only once across many tokens', async () => {
    const { api } = fakeApi();
    const provider = createTurnstileProvider({ siteKey: 'k', loadScript: async () => api });

    await provider.getToken();
    await provider.getToken();

    expect(api.render).toHaveBeenCalledTimes(1);
  });

  it('passes the configured site key through', async () => {
    const { api } = fakeApi();
    const provider = createTurnstileProvider({ siteKey: 'my-site-key', loadScript: async () => api });
    await provider.getToken();

    expect(api.render.mock.calls[0]![1]!['sitekey']).toBe('my-site-key');
    expect(api.render.mock.calls[0]![1]!['size']).toBe('invisible');
  });
});

describe('failure handling', () => {
  it('rejects when the challenge errors', async () => {
    const { api, fail } = fakeApi();
    api.execute.mockImplementation(() => {
      queueMicrotask(() => fail('bad-request'));
    });
    const provider = createTurnstileProvider({ siteKey: 'k', loadScript: async () => api });

    await expect(provider.getToken()).rejects.toBeInstanceOf(TurnstileError);
  });

  it('rejects when the script cannot load, and never resolves a token', async () => {
    const provider = createTurnstileProvider({
      siteKey: 'k',
      loadScript: async () => {
        throw new TurnstileError('blocked');
      },
    });

    await expect(provider.getToken()).rejects.toThrow(/blocked/);
  });

  it('times out rather than hanging a session forever', async () => {
    vi.useFakeTimers();
    const { api } = fakeApi();
    api.execute.mockImplementation(() => undefined); // never calls back

    const provider = createTurnstileProvider({
      siteKey: 'k',
      loadScript: async () => api,
      timeoutMs: 1000,
    });

    const pending = provider.getToken();
    const assertion = expect(pending).rejects.toThrow(/timed out/);
    await vi.advanceTimersByTimeAsync(1500);
    await assertion;
    vi.useRealTimers();
  });

  it('refuses two challenges at once', async () => {
    const { api } = fakeApi();
    api.execute.mockImplementation(() => undefined);
    const provider = createTurnstileProvider({ siteKey: 'k', loadScript: async () => api });

    void provider.getToken();
    await expect(provider.getToken()).rejects.toThrow(/already in flight/);
  });
});

describe('lifecycle', () => {
  it('reset() discards an in-flight challenge', async () => {
    const { api } = fakeApi();
    api.execute.mockImplementation(() => undefined);
    const provider = createTurnstileProvider({ siteKey: 'k', loadScript: async () => api });

    const pending = provider.getToken();
    const assertion = expect(pending).rejects.toThrow(/reset/);
    provider.reset();
    await assertion;
  });

  it('destroy() removes the widget and its container', async () => {
    const { api } = fakeApi();
    const provider = createTurnstileProvider({ siteKey: 'k', loadScript: async () => api });
    await provider.getToken();

    expect(document.body.children.length).toBe(1);
    provider.destroy();

    expect(api.remove).toHaveBeenCalledWith('widget-1');
    expect(document.body.children.length).toBe(0);
  });

  it('destroy() is idempotent and blocks further tokens', async () => {
    const { api } = fakeApi();
    const provider = createTurnstileProvider({ siteKey: 'k', loadScript: async () => api });
    await provider.getToken();

    provider.destroy();
    expect(() => provider.destroy()).not.toThrow();
    await expect(provider.getToken()).rejects.toThrow(/destroyed/);
  });
});

describe('laziness', () => {
  it('fetches nothing from Cloudflare until a token is asked for', () => {
    createTurnstileProvider({ siteKey: 'k' });
    expect(document.querySelector(`script[src="${TURNSTILE_SCRIPT_URL}"]`)).toBeNull();
    expect(document.head.querySelectorAll('script').length).toBe(0);
  });
});
