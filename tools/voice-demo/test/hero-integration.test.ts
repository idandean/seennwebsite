/**
 * The voice demo as part of the first fold of the live homepages.
 *
 * Two things are being protected at once, and they pull in opposite
 * directions: the demo must actually be ON, and the existing sales funnel —
 * headline, supporting copy, primary CTA and its analytics — must be exactly
 * as it was. The demo is a secondary, interactive experience, not a
 * replacement for the business CTA.
 *
 * Assertions read the COMMITTED HTML, so they fail when a page changes rather
 * than only when a test does.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG, resolveConfig, unavailableReason } from '../src/config';
import { stringsFor } from '../src/i18n';
import { VoiceDemoWidget } from '../src/widget';
import type { VoiceDemoConfig } from '../src/config';
import type { DemoLocale } from '../src/contract';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (rel: string): string => readFileSync(path.join(REPO_ROOT, rel), 'utf8');

const HOMEPAGES = [
  ['index.html', 'en'],
  ['he/index.html', 'he'],
] as const;

/** The exact working values already proven on the staging page. */
const LIVE = {
  endpointBaseUrl: 'https://oonqpttzpamtxiifitvf.supabase.co',
  anonKey: 'sb_publishable_NvlifnKa0ZVG6p4mMZBJHQ_kNDpWup4',
  turnstileSiteKey: '0x4AAAAAAEEN9zjBnCHDnqNy',
} as const;

function inlineConfigOf(html: string): Partial<VoiceDemoConfig> {
  const match = html.match(/window\.SEENN_VOICE_DEMO\s*=\s*(\{[\s\S]*?\});/);
  if (!match?.[1]) throw new Error('no window.SEENN_VOICE_DEMO assignment found');
  return Function(`"use strict"; return (${match[1]});`)() as Partial<VoiceDemoConfig>;
}

beforeEach(() => {
  document.body.innerHTML = '';
  document.head.querySelectorAll('meta[name="seenn:public-demo-mode"]').forEach((el) => el.remove());
  window.history.replaceState({}, '', '/');
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn() },
  });
});

describe('activation on both homepages', () => {
  it.each(HOMEPAGES)('%s carries the working configuration', (page) => {
    const inline = inlineConfigOf(read(page));
    expect(inline.publicDemoMode).toBe('enabled');
    expect(inline.endpointBaseUrl).toBe(LIVE.endpointBaseUrl);
    expect(inline.anonKey).toBe(LIVE.anonKey);
    expect(inline.turnstileSiteKey).toBe(LIVE.turnstileSiteKey);
  });

  it.each(HOMEPAGES)('%s reuses the SAME values as the staging page', (page) => {
    expect(inlineConfigOf(read(page))).toEqual(inlineConfigOf(read('voice-demo-staging.html')));
  });

  it.each(HOMEPAGES)('%s resolves to a runnable widget', (page) => {
    const config = resolveConfig({ inline: inlineConfigOf(read(page)) });
    expect(config.publicDemoMode).toBe('enabled');
    expect(unavailableReason(config)).toBeNull();
  });

  it.each(HOMEPAGES)('%s no longer ships the mount hidden', (page) => {
    expect(read(page)).toMatch(/data-seenn-voice-demo(?!\s+hidden)/);
    expect(read(page)).not.toMatch(/data-seenn-voice-demo\s+hidden/);
  });

  it.each(HOMEPAGES)('%s loads the config before the bundle', (page) => {
    const html = read(page);
    expect(html.indexOf('SEENN_VOICE_DEMO')).toBeLessThan(html.indexOf('voice-demo.js'));
  });

  it.each(HOMEPAGES)('%s documents the one-line kill switch', (page) => {
    expect(read(page)).toContain('seenn:public-demo-mode');
  });

  it('the meta kill switch still overrides an enabled page', () => {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'seenn:public-demo-mode');
    meta.setAttribute('content', 'disabled');
    document.head.appendChild(meta);

    const config = resolveConfig({ inline: inlineConfigOf(read('index.html')) });
    expect(config.publicDemoMode).toBe('disabled');
  });
});

describe('the existing sales funnel is untouched', () => {
  it.each(HOMEPAGES)('%s keeps its H1', (page) => {
    const html = read(page);
    expect((html.match(/<h1/g) ?? []).length).toBe(1);
    expect(html).toMatch(/<h1[^>]*>[\s\S]{20,}?<\/h1>/);
  });

  it.each(HOMEPAGES)('%s keeps the primary CTA and its analytics hook', (page) => {
    const html = read(page);
    // The business CTA opens the demo-request modal; that handler is what
    // analytics and the sales funnel hang off.
    expect(html).toContain('openDemoModal()');
    expect(html).toContain('bg-[#C9B555]');
  });

  it('the English CTA keeps its i18n key', () => {
    expect(read('index.html')).toContain('data-i18n="requestDemoBtn"');
  });

  it.each(HOMEPAGES)('%s keeps its canonical, hreflang and structured data', (page) => {
    const html = read(page);
    expect(html).toContain('rel="canonical"');
    expect(html).toContain('hreflang');
    expect(html).toContain('application/ld+json');
  });

  it.each(HOMEPAGES)('%s keeps analytics and navigation', (page) => {
    const html = read(page);
    expect(html).toContain('googletagmanager.com/gtag/js');
    expect(html).toContain('<nav');
  });

  it('the voice demo does not replace the CTA — both are present', () => {
    for (const [page] of HOMEPAGES) {
      const html = read(page);
      expect(html.indexOf('openDemoModal()')).toBeGreaterThan(-1);
      expect(html.indexOf('data-seenn-voice-demo')).toBeGreaterThan(-1);
    }
  });
});

describe('card copy — an invitation, not a test surface', () => {
  const LOCALES: DemoLocale[] = ['en', 'he', 'ar'];

  it('every locale has the eyebrow, invitation, start button and session meta', () => {
    for (const locale of LOCALES) {
      const s = stringsFor(locale);
      for (const key of ['readyTitle', 'readyBody', 'startButton', 'sessionMeta'] as const) {
        expect(s[key], `${locale}.${key}`).toBeTruthy();
      }
    }
  });

  it('the English copy reads as the brief specifies', () => {
    const s = stringsFor('en');
    expect(s.startButton).toMatch(/talk to the ai collection agent/i);
    expect(s.sessionMeta).toMatch(/microphone/i);
    // '~2 min' folded into the footer when the card header was removed.
    expect(s.sessionMeta).toMatch(/2 min/i);
  });

  it('carries no staging, diagnostic or implementation wording in any locale', () => {
    const banned = [
      /staging/i, /simulated/i, /mock/i, /debug/i, /diagnostic/i,
      /PUBLIC_DEMO_MODE/i, /supabase/i, /livekit/i, /turnstile/i,
      /endpoint/i, /session id/i, /503/, /unlisted/i,
    ];
    for (const locale of LOCALES) {
      const all = Object.values(stringsFor(locale) as unknown as Record<string, string>).join(' ');
      for (const pattern of banned) {
        expect(pattern.test(all), `${locale} matched ${pattern}`).toBe(false);
      }
    }
  });

  it('never implies the visitor is being recorded', () => {
    for (const locale of LOCALES) {
      const all = Object.values(stringsFor(locale) as unknown as Record<string, string>).join(' ');
      expect(/recorded|recording/i.test(all), locale).toBe(false);
    }
  });

  it('hides the support id on the public homepages by default', () => {
    // A raw session identifier is a support affordance, not homepage copy.
    expect(DEFAULT_CONFIG.showSupportId).toBe(false);
  });
});

describe('the signup CTA matches the site own Request a Demo', () => {
  it('uses the same wording as the homepage buttons, per locale', () => {
    expect(stringsFor('en').signupCta).toBe('Request a Demo');
    expect(read('index.html')).toContain(stringsFor('en').signupCta);

    expect(stringsFor('he').signupCta).toBe('בקשו הדגמה');
    expect(read('he/index.html')).toContain(stringsFor('he').signupCta);
  });

  it('never says "Start free" in any locale', () => {
    for (const locale of ['en', 'he', 'ar'] as const) {
      const all = Object.values(stringsFor(locale) as unknown as Record<string, string>).join(' ');
      expect(/start free/i.test(all), locale).toBe(false);
    }
    expect(stringsFor('he').signupCta).not.toMatch(/בחינם/);
  });

  it('opens the same demo modal the rest of the site uses', () => {
    const openDemoModal = vi.fn();
    (window as { openDemoModal?: () => void }).openDemoModal = openDemoModal;

    const mount = document.createElement('div');
    mount.setAttribute('data-seenn-voice-demo', '');
    document.body.appendChild(mount);
    const widget = new VoiceDemoWidget(
      mount,
      { ...DEFAULT_CONFIG, publicDemoMode: 'enabled', ...LIVE, languageLookupUrl: '' },
      {},
    );
    void widget;

    mount.querySelector<HTMLAnchorElement>('.svd__cta-button')!.click();
    expect(openDemoModal).toHaveBeenCalledTimes(1);

    delete (window as { openDemoModal?: () => void }).openDemoModal;
  });

  it('still falls back to a real link where no modal exists', () => {
    delete (window as { openDemoModal?: () => void }).openDemoModal;
    const mount = document.createElement('div');
    mount.setAttribute('data-seenn-voice-demo', '');
    document.body.appendChild(mount);
    new VoiceDemoWidget(
      mount,
      { ...DEFAULT_CONFIG, publicDemoMode: 'enabled', ...LIVE, languageLookupUrl: '' },
      {},
    );

    const cta = mount.querySelector<HTMLAnchorElement>('.svd__cta-button')!;
    expect(cta.tagName).toBe('A');
    expect(cta.href).toContain('utm_medium=voice_demo');
  });
});

describe('rendered card', () => {
  function mountWidget(lang: string, overrides: Partial<VoiceDemoConfig> = {}) {
    document.documentElement.setAttribute('lang', lang);
    const mount = document.createElement('div');
    mount.setAttribute('data-seenn-voice-demo', '');
    document.body.appendChild(mount);

    const config: VoiceDemoConfig = {
      ...DEFAULT_CONFIG,
      publicDemoMode: 'enabled',
      ...LIVE,
      languageLookupUrl: '',
      ...overrides,
    };
    return { widget: new VoiceDemoWidget(mount, config, {}), mount };
  }

  it('shows only the invitation, the button and the practical line', () => {
    const { mount } = mountWidget('en');
    const text = mount.textContent ?? '';

    expect(text).toMatch(/microphone required/i);
    expect(mount.querySelector('.svd__start')).not.toBeNull();
    expect(mount.querySelector('.svd__start')!.textContent).toMatch(/talk to the ai collection agent/i);
  });

  it('the start control is a real button with an accessible name', () => {
    const { mount } = mountWidget('en');
    const start = mount.querySelector<HTMLButtonElement>('.svd__start')!;
    expect(start.tagName).toBe('BUTTON');
    expect(start.type).toBe('button');
    expect((start.textContent ?? '').trim().length).toBeGreaterThan(0);
  });

  it('exposes an aria-live status region', () => {
    const { mount } = mountWidget('en');
    const live = mount.querySelector('[role="status"]');
    expect(live).not.toBeNull();
    expect(live!.getAttribute('aria-live')).toBe('polite');
  });

  it('shows no language selector of any kind', () => {
    const { mount } = mountWidget('en');
    expect(mount.querySelector('select')).toBeNull();
    expect(mount.querySelector('form')).toBeNull();
    expect(mount.querySelector('[name="language"]')).toBeNull();
  });

  it('renders exactly one orb — never a duplicate', () => {
    const { mount } = mountWidget('en');
    expect(mount.querySelectorAll('.preview-orb').length).toBe(1);
  });

  it('shows no support id by default', () => {
    const { mount } = mountWidget('en');
    expect(mount.querySelector('.svd__support')?.hasAttribute('hidden')).not.toBe(false);
  });

  it('renders Hebrew RTL with translated copy', () => {
    const { mount } = mountWidget('he');
    const root = mount.querySelector('.svd')!;
    expect(root.getAttribute('dir')).toBe('rtl');
    expect(root.getAttribute('lang')).toBe('he');
    expect(mount.textContent ?? '').not.toMatch(/start voice demo/i);
  });

  it('renders Arabic RTL', () => {
    const { mount } = mountWidget('ar');
    expect(mount.querySelector('.svd')!.getAttribute('dir')).toBe('rtl');
  });

  it('mounts the video orb core, muted and silent', () => {
    const { mount } = mountWidget('en');
    const core = mount.querySelector<HTMLVideoElement>('video.preview-orb__core');

    expect(core).not.toBeNull();
    expect(core!.src).toContain('orb-core.mp4');
    // Decorative motion only. The asset itself has no audio track, and the
    // element is muted regardless — nothing here can ever make sound.
    expect(core!.muted).toBe(true);
    expect(core!.loop).toBe(true);
    expect(core!.hasAttribute('playsinline')).toBe(true);
    expect(core!.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders a moving equaliser with staggered bars', () => {
    const { mount } = mountWidget('en');
    const bars = mount.querySelectorAll<HTMLElement>('.svd__bar');

    expect(mount.querySelector('.svd__bars')!.getAttribute('aria-hidden')).toBe('true');
    expect(bars.length).toBeGreaterThan(20);

    // Each bar needs its own height and phase, or the row pulses as one block.
    const heights = new Set<string>();
    const delays = new Set<string>();
    bars.forEach((bar) => {
      heights.add(bar.style.getPropertyValue('--h'));
      delays.add(bar.style.getPropertyValue('--d'));
      expect(bar.style.getPropertyValue('--h')).not.toBe('');
    });
    expect(heights.size).toBeGreaterThan(5);
    expect(delays.size).toBeGreaterThan(1);
  });

  it('still renders exactly one orb alongside the wave', () => {
    const { mount } = mountWidget('en');
    expect(mount.querySelectorAll('.preview-orb').length).toBe(1);
    expect(mount.querySelectorAll('video.preview-orb__core').length).toBe(1);
    expect(mount.querySelectorAll('.preview-orb__rim').length).toBe(1);
  });

  it('does not autoplay audio or touch the microphone on mount', () => {
    const getUserMedia = vi.fn();
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
    const { mount } = mountWidget('en');

    expect(getUserMedia).not.toHaveBeenCalled();
    const audio = mount.querySelector<HTMLAudioElement>('audio');
    // The element exists for the iOS unlock, but nothing plays until a click.
    expect(audio?.getAttribute('src')).toBeNull();
  });
});
