import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG, resolveConfig, unavailableReason } from '../src/config';

function setMeta(content: string | null): void {
  document.head.querySelectorAll('meta[name="seenn:public-demo-mode"]').forEach((el) => el.remove());
  if (content === null) return;
  const meta = document.createElement('meta');
  meta.setAttribute('name', 'seenn:public-demo-mode');
  meta.setAttribute('content', content);
  document.head.appendChild(meta);
}

function setSearch(search: string): void {
  window.history.replaceState({}, '', `/${search}`);
}

beforeEach(() => {
  setMeta(null);
  setSearch('');
  delete (window as { SEENN_VOICE_DEMO?: unknown }).SEENN_VOICE_DEMO;
});

describe('PUBLIC_DEMO_MODE', () => {
  it('is disabled by default — nothing configured means nothing runs', () => {
    expect(DEFAULT_CONFIG.publicDemoMode).toBe('disabled');
    expect(resolveConfig().publicDemoMode).toBe('disabled');
  });

  it('reads a meta tag', () => {
    setMeta('enabled');
    expect(resolveConfig().publicDemoMode).toBe('enabled');
  });

  it('lets inline config beat the meta tag', () => {
    setMeta('enabled');
    expect(resolveConfig({ inline: { publicDemoMode: 'disabled' } }).publicDemoMode).toBe('disabled');
  });

  it('lets the URL parameter beat everything, for QA', () => {
    setMeta('disabled');
    setSearch('?voicedemo=enabled');
    expect(resolveConfig({ inline: { publicDemoMode: 'disabled' } }).publicDemoMode).toBe('enabled');
  });

  it('treats an unrecognised value as not-a-vote rather than as on', () => {
    setMeta('banana');
    expect(resolveConfig().publicDemoMode).toBe('disabled');
  });

  it('accepts the usual truthy spellings', () => {
    for (const value of ['enabled', 'on', 'true', '1', 'ENABLED', ' enabled ']) {
      setMeta(value);
      expect(resolveConfig().publicDemoMode, value).toBe('enabled');
    }
  });
});

describe('credential safety', () => {
  it('refuses a Supabase service-role key and switches the demo off', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    // header.payload.signature where payload decodes to {"role":"service_role"}
    const payload = btoa(JSON.stringify({ role: 'service_role', iss: 'supabase' }));
    const serviceKey = `eyJhbGciOiJIUzI1NiJ9.${payload}.sig`;

    const config = resolveConfig({
      inline: {
        publicDemoMode: 'enabled',
        endpointBaseUrl: 'https://stub.supabase.co',
        anonKey: serviceKey,
      },
    });

    expect(config.anonKey).toBe('');
    expect(config.publicDemoMode).toBe('disabled');
    expect(error).toHaveBeenCalled();

    // And the message itself must not contain the credential.
    const logged = error.mock.calls.flat().join(' ');
    expect(logged).not.toContain(payload);
  });

  it('refuses a LiveKit API secret pasted into the key field', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const config = resolveConfig({
      inline: {
        publicDemoMode: 'enabled',
        endpointBaseUrl: 'https://stub.supabase.co',
        anonKey: 'LIVEKIT_API_SECRET_abcdef123456',
      },
    });
    expect(config.publicDemoMode).toBe('disabled');
  });

  it('accepts a normal anon key', () => {
    const payload = btoa(JSON.stringify({ role: 'anon', iss: 'supabase' }));
    const config = resolveConfig({
      inline: {
        publicDemoMode: 'enabled',
        endpointBaseUrl: 'https://stub.supabase.co',
        anonKey: `eyJhbGciOiJIUzI1NiJ9.${payload}.sig`,
      },
    });
    expect(config.publicDemoMode).toBe('enabled');
    expect(config.anonKey).not.toBe('');
  });
});

describe('unavailableReason', () => {
  const base = { ...DEFAULT_CONFIG, endpointBaseUrl: 'https://x.supabase.co', anonKey: 'anon' };

  it('reports the flag first', () => {
    expect(unavailableReason({ ...base, publicDemoMode: 'disabled' })).toBe('flag_disabled');
  });

  it('reports a missing endpoint even when the flag is on', () => {
    expect(unavailableReason({ ...base, publicDemoMode: 'enabled', endpointBaseUrl: '' })).toBe(
      'endpoint_not_configured',
    );
    expect(unavailableReason({ ...base, publicDemoMode: 'enabled', anonKey: '' })).toBe(
      'endpoint_not_configured',
    );
  });

  it('returns null only when the flag is on and it has somewhere to call', () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: () => Promise.resolve({}) },
    });
    expect(unavailableReason({ ...base, publicDemoMode: 'enabled' })).toBeNull();
  });

  it('reports an unsupported browser when getUserMedia is absent', () => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined });
    expect(unavailableReason({ ...base, publicDemoMode: 'enabled' })).toBe('browser_unsupported');
  });
});
