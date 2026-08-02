/**
 * Asserts against the COMMITTED HTML, not against fixtures.
 *
 * Everything here reads the real files out of the repository, so it fails if
 * someone edits a page rather than only if someone edits a test. The two things
 * being protected are opposites:
 *
 *   - voice-demo-staging.html   MUST carry working staging configuration
 *   - index.html / he/index.html MUST carry none, and stay hidden
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { PublicVoiceDemoClient } from '../src/client';
import { looksLikeServerSecret } from '../src/contract';
import { resolveConfig, unavailableReason } from '../src/config';
import type { VoiceDemoConfig } from '../src/config';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

const read = (relative: string): string =>
  readFileSync(path.join(REPO_ROOT, relative), 'utf8');

const STAGING_PAGE = read('voice-demo-staging.html');
const HOMEPAGES = ['index.html', 'he/index.html'] as const;

/** The exact values the controlled test must resolve to. */
const EXPECTED = {
  endpointBaseUrl: 'https://oonqpttzpamtxiifitvf.supabase.co',
  anonKey: 'sb_publishable_NvlifnKa0ZVG6p4mMZBJHQ_kNDpWup4',
  turnstileSiteKey: '0x4AAAAAAEEN9zjBnCHDnqNy',
  endpoint: 'https://oonqpttzpamtxiifitvf.supabase.co/functions/v1/public-voice-demo',
} as const;

/**
 * Pulls the real `window.SEENN_VOICE_DEMO` object out of the committed page by
 * executing the assignment it contains, so the test reads exactly what a
 * browser would rather than a re-typed copy.
 */
function configFromStagingPage(): Partial<VoiceDemoConfig> {
  const match = STAGING_PAGE.match(/window\.SEENN_VOICE_DEMO\s*=\s*(\{[\s\S]*?\});/);
  if (!match?.[1]) throw new Error('no window.SEENN_VOICE_DEMO assignment found in staging page');
  return Function(`"use strict"; return (${match[1]});`)() as Partial<VoiceDemoConfig>;
}

beforeEach(() => {
  document.head.querySelectorAll('meta[name="seenn:public-demo-mode"]').forEach((el) => el.remove());
  window.history.replaceState({}, '', '/');
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: () => Promise.resolve({}) },
  });
});

describe('staging page — discoverability', () => {
  it('is marked noindex, nofollow', () => {
    expect(STAGING_PAGE).toMatch(/<meta\s+name="robots"\s+content="noindex,\s*nofollow"/i);
  });

  it('is not linked from the sitemap or llms.txt', () => {
    expect(read('sitemap.xml')).not.toContain('voice-demo-staging');
    expect(read('llms.txt')).not.toContain('voice-demo-staging');
  });

  it('is not disallowed in robots.txt — a crawler must be able to read the noindex', () => {
    expect(read('robots.txt')).not.toContain('voice-demo-staging');
  });

  it('is not linked from either homepage', () => {
    for (const page of HOMEPAGES) {
      expect(read(page), page).not.toContain('voice-demo-staging');
    }
  });
});

describe('staging page — controlled activation resolves the exact staging target', () => {
  const inline = configFromStagingPage();

  it('declares the demo enabled', () => {
    expect(inline.publicDemoMode).toBe('enabled');
  });

  it('carries the exact staging endpoint base URL', () => {
    expect(inline.endpointBaseUrl).toBe(EXPECTED.endpointBaseUrl);
  });

  it('carries the exact staging publishable key', () => {
    expect(inline.anonKey).toBe(EXPECTED.anonKey);
  });

  it('carries the exact Turnstile site key', () => {
    expect(inline.turnstileSiteKey).toBe(EXPECTED.turnstileSiteKey);
  });

  it('resolves through the real config mechanism to an enabled, runnable widget', () => {
    const config = resolveConfig({ inline });
    expect(config.publicDemoMode).toBe('enabled');
    expect(unavailableReason(config)).toBeNull();
  });

  it('produces exactly the required POST URL', () => {
    const config = resolveConfig({ inline });
    const client = new PublicVoiceDemoClient({
      baseUrl: config.endpointBaseUrl,
      anonKey: config.anonKey,
      path: config.endpointPath,
      requireTurnstileToken: true,
    });
    expect(client.endpoint).toBe(EXPECTED.endpoint);
  });

  it('the publishable key survives the server-secret guard', () => {
    expect(looksLikeServerSecret(EXPECTED.anonKey)).toBe(false);
    // And resolveConfig does not blank it out.
    expect(resolveConfig({ inline }).anonKey).toBe(EXPECTED.anonKey);
  });

  it('loads the config before the widget bundle, or it would never be read', () => {
    const configAt = STAGING_PAGE.indexOf('window.SEENN_VOICE_DEMO');
    const bundleAt = STAGING_PAGE.indexOf('/js/voice-demo.js');
    expect(configAt).toBeGreaterThan(-1);
    expect(bundleAt).toBeGreaterThan(-1);
    expect(configAt).toBeLessThan(bundleAt);
  });

  it('still ships the mount hidden, so a misconfiguration shows nothing', () => {
    expect(STAGING_PAGE).toMatch(/data-seenn-voice-demo\s+hidden/);
  });
});

describe('homepages stay hidden and unconfigured', () => {
  it('contain no SEENN_VOICE_DEMO configuration at all', () => {
    for (const page of HOMEPAGES) {
      expect(read(page), page).not.toContain('SEENN_VOICE_DEMO');
    }
  });

  it('contain none of the staging values', () => {
    for (const page of HOMEPAGES) {
      const html = read(page);
      expect(html, page).not.toContain(EXPECTED.endpointBaseUrl);
      expect(html, page).not.toContain(EXPECTED.anonKey);
      expect(html, page).not.toContain(EXPECTED.turnstileSiteKey);
      expect(html, page).not.toContain('supabase.co');
    }
  });

  it('keep their mounts hidden', () => {
    for (const page of HOMEPAGES) {
      expect(read(page), page).toMatch(/data-seenn-voice-demo\s+hidden/);
    }
  });

  it('resolve to disabled with no inline config present', () => {
    // What a homepage visit actually produces: nothing on window, nothing set.
    expect(resolveConfig({ inline: undefined }).publicDemoMode).toBe('disabled');
    expect(unavailableReason(resolveConfig({ inline: undefined }))).toBe('flag_disabled');
  });

  it('cannot be switched on by a URL parameter', () => {
    window.history.replaceState({}, '', '/?voicedemo=enabled');
    expect(resolveConfig({ inline: undefined }).publicDemoMode).toBe('disabled');
  });
});

describe('no secrets anywhere in the shipped site', () => {
  const SECRET_PATTERNS: Array<[string, RegExp]> = [
    ['service_role', /service_role/i],
    ['sb_secret_', /sb_secret_/i],
    ['TURNSTILE_SECRET', /TURNSTILE_SECRET/i],
    ['LiveKit API secret', /LIVEKIT_API_SECRET|LIVEKIT_API_KEY/i],
    ['Supabase service env', /SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SERVICE_KEY/i],
    ['generic secret key', /\bsk_live_|\bsk_test_/i],
    ['postgres URI', /postgres(ql)?:\/\//i],
  ];

  const SHIPPED_PAGES = [
    'voice-demo-staging.html',
    'index.html',
    'he/index.html',
    'privacy-policy.html',
    'he/privacy-policy.html',
  ];

  for (const page of SHIPPED_PAGES) {
    it(`${page} contains no secret-shaped values`, () => {
      const html = read(page);
      for (const [label, pattern] of SECRET_PATTERNS) {
        expect(pattern.test(html), `${page} matched ${label}`).toBe(false);
      }
    });
  }

  it('the generated bundle contains no credential literals', () => {
    const bundle = read('js/voice-demo.js');
    // The guard's own detection regex mentions these names, so assert on the
    // shape of an actual credential rather than the words.
    expect(bundle).not.toContain(EXPECTED.anonKey);
    expect(bundle).not.toContain(EXPECTED.turnstileSiteKey);
    expect(bundle).not.toContain(EXPECTED.endpointBaseUrl);
    expect(bundle).not.toMatch(/sb_secret_[A-Za-z0-9_-]{8,}/);
    expect(bundle).not.toMatch(/eyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{20,}/);
  });

  it('the Turnstile action is unchanged', () => {
    expect(read('js/voice-demo.js')).toContain('public_voice_demo');
  });
});

describe('privacy policy discloses Turnstile', () => {
  for (const page of ['privacy-policy.html', 'he/privacy-policy.html']) {
    it(`${page} links the Cloudflare Turnstile Privacy Addendum`, () => {
      const html = read(page);
      expect(html).toContain('https://www.cloudflare.com/turnstile-privacy-policy/');
      expect(html).toMatch(/Turnstile/);
    });

    it(`${page} states that it runs in Invisible mode`, () => {
      expect(read(page)).toMatch(/Invisible/i);
    });
  }
});
