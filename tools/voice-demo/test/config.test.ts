import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_CONFIG,
  LIVEKIT_CLIENT_VERSION,
  LIVEKIT_MODULE_URL,
  resolveConfig,
  unavailableReason,
} from '../src/config';

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

const ENABLED_INLINE = {
  publicDemoMode: 'enabled' as const,
  endpointBaseUrl: 'https://stub.supabase.co',
  anonKey: 'anon-key',
  turnstileSiteKey: 'site-key',
};

beforeEach(() => {
  setMeta(null);
  setSearch('');
  delete (window as { SEENN_VOICE_DEMO?: unknown }).SEENN_VOICE_DEMO;
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: () => Promise.resolve({}) },
  });
});

describe('committed defaults', () => {
  it('ship disabled and empty', () => {
    expect(DEFAULT_CONFIG.publicDemoMode).toBe('disabled');
    expect(DEFAULT_CONFIG.endpointBaseUrl).toBe('');
    expect(DEFAULT_CONFIG.anonKey).toBe('');
    expect(DEFAULT_CONFIG.turnstileSiteKey).toBe('');
  });

  it('resolve to disabled with nothing configured', () => {
    expect(resolveConfig().publicDemoMode).toBe('disabled');
  });
});

describe('only window.SEENN_VOICE_DEMO can enable', () => {
  it('inline config enables', () => {
    expect(resolveConfig({ inline: { publicDemoMode: 'enabled' } }).publicDemoMode).toBe('enabled');
  });

  it('reads inline config off window when no source is passed', () => {
    (window as { SEENN_VOICE_DEMO?: unknown }).SEENN_VOICE_DEMO = { publicDemoMode: 'enabled' };
    expect(resolveConfig().publicDemoMode).toBe('enabled');
  });

  it('only the exact string "enabled" counts — no truthy spellings', () => {
    for (const value of ['on', 'true', '1', 'yes', 'ENABLED', 'Enabled', ' enabled']) {
      const config = resolveConfig({
        inline: { publicDemoMode: value as unknown as 'enabled' },
      });
      expect(config.publicDemoMode, value).toBe('disabled');
    }
  });
});

describe('kill switches can disable but never enable', () => {
  it('?voicedemo=enabled does NOT enable a disabled config', () => {
    setSearch('?voicedemo=enabled');
    expect(resolveConfig().publicDemoMode).toBe('disabled');
  });

  it('?voicedemo=on / true / 1 do not enable either', () => {
    for (const value of ['on', 'true', '1', 'yes']) {
      setSearch(`?voicedemo=${value}`);
      expect(resolveConfig().publicDemoMode, value).toBe('disabled');
    }
  });

  it('?voicedemo=off disables an enabled config', () => {
    for (const value of ['off', 'disabled', 'false', '0']) {
      setSearch(`?voicedemo=${value}`);
      expect(resolveConfig({ inline: ENABLED_INLINE }).publicDemoMode, value).toBe('disabled');
    }
  });

  it('the meta tag cannot enable', () => {
    setMeta('enabled');
    expect(resolveConfig().publicDemoMode).toBe('disabled');
  });

  it('the meta tag can disable — a kill switch that needs no code change', () => {
    setMeta('disabled');
    expect(resolveConfig({ inline: ENABLED_INLINE }).publicDemoMode).toBe('disabled');
  });

  it('either kill switch alone is enough', () => {
    setMeta('disabled');
    setSearch('?voicedemo=enabled');
    expect(resolveConfig({ inline: ENABLED_INLINE }).publicDemoMode).toBe('disabled');
  });
});

describe('credential safety', () => {
  const enabledWith = (anonKey: string) =>
    resolveConfig({ inline: { ...ENABLED_INLINE, anonKey } });

  it('refuses a legacy service-role JWT and switches the demo off', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const payload = btoa(JSON.stringify({ role: 'service_role', iss: 'supabase' }));

    const config = enabledWith(`eyJhbGciOiJIUzI1NiJ9.${payload}.sig`);

    expect(config.anonKey).toBe('');
    expect(config.publicDemoMode).toBe('disabled');
    expect(error).toHaveBeenCalled();
    expect(error.mock.calls.flat().join(' ')).not.toContain(payload);
  });

  it('refuses a modern sb_secret_ key', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(enabledWith('sb_secret_AbCdEf123456').publicDemoMode).toBe('disabled');
  });

  it('refuses a LiveKit API secret pasted into the key field', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(enabledWith('LIVEKIT_API_SECRET_abcdef123456').publicDemoMode).toBe('disabled');
  });

  it('accepts a modern sb_publishable_ key', () => {
    expect(enabledWith('sb_publishable_AbCdEf123456').publicDemoMode).toBe('enabled');
  });

  it('accepts a legacy anon JWT', () => {
    const payload = btoa(JSON.stringify({ role: 'anon', iss: 'supabase' }));
    expect(enabledWith(`eyJhbGciOiJIUzI1NiJ9.${payload}.sig`).publicDemoMode).toBe('enabled');
  });
});

describe('unavailableReason — fail closed', () => {
  const base = { ...DEFAULT_CONFIG, ...ENABLED_INLINE };

  it('reports the flag first', () => {
    expect(unavailableReason({ ...base, publicDemoMode: 'disabled' })).toBe('flag_disabled');
  });

  it('refuses to run without an endpoint or key', () => {
    expect(unavailableReason({ ...base, endpointBaseUrl: '' })).toBe('endpoint_not_configured');
    expect(unavailableReason({ ...base, anonKey: '' })).toBe('endpoint_not_configured');
  });

  it('refuses to run without a Turnstile site key', () => {
    expect(unavailableReason({ ...base, turnstileSiteKey: '' })).toBe('turnstile_not_configured');
  });

  it('returns null only when flag, endpoint, key and site key are all present', () => {
    expect(unavailableReason(base)).toBeNull();
  });

  it('reports an unsupported browser when getUserMedia is absent', () => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined });
    expect(unavailableReason(base)).toBe('browser_unsupported');
  });
});

describe('LiveKit CDN pin', () => {
  it('is an exact version, not a floating range', () => {
    expect(LIVEKIT_CLIENT_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(DEFAULT_CONFIG.livekitModuleUrl).toBe(LIVEKIT_MODULE_URL);
    expect(DEFAULT_CONFIG.livekitModuleUrl).toContain(`livekit-client@${LIVEKIT_CLIENT_VERSION}`);
    expect(DEFAULT_CONFIG.livekitModuleUrl).not.toMatch(/livekit-client@\d+\/|@latest|@\^|@~/);
  });
});
