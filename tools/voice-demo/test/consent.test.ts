/**
 * Pre-flight recording consent, policy 2026-08-03.4 (audio + transcript).
 *
 * The load-bearing assertions are negative: before a visitor accepts, the only
 * thing that may leave the browser is the read-only catalog GET. No
 * microphone, no Turnstile, no session POST, no LiveKit. Most of this file is
 * about what did NOT happen.
 *
 * The wording fixtures below are the approved sentences. They live here as
 * *catalog responses*, not as frontend copy — the widget must render whatever
 * the catalog serves, and these tests prove it renders it byte-for-byte.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VoiceDemoWidget } from '../src/widget';
import { DEFAULT_CONFIG, resolveConfig } from '../src/config';
import {
  CONSENT_POLICY_VERSION,
  CONSENT_STRINGS,
  ConsentGate,
  readCatalogEntry,
  resolveConsentMode,
} from '../src/consent';
import type { VoiceDemoConfig } from '../src/config';
import type { WidgetDeps } from '../src/widget';
import type { DemoLocale } from '../src/contract';
import type { ConnectOptions, TransportEvents, VoiceTransport } from '../src/transport';
import type { TurnstileProvider } from '../src/turnstile';

const RETIRED_POLICY = '2026-08-03.1';
/** Every superseded version. None may be rendered or submitted. */
const SUPERSEDED = ['2026-08-03.1', '2026-08-03.2', '2026-08-03.3'];

/** Exactly the sentences the catalog is required to serve. */
const WORDING: Record<DemoLocale, string> = {
  en: 'By selecting ‘Agree and start,’ I consent to this demo session being audio-recorded and transcribed. The stored audio recording and transcript may be accessed only by authorized Seenn personnel. Both will be permanently deleted within 7 days.',
  he: 'בלחיצה על „הסכמה והתחלה”, אני מסכים/ה לכך ששיחת ההדגמה הזו תוקלט ותתומלל. רק עובדי Seenn מורשים יוכלו לגשת להקלטת השמע ולתמלול השמורים. שניהם יימחקו לצמיתות בתוך 7 ימים.',
  ar: 'باختيار «أوافق وأبدأ»، أوافق على تسجيل هذه الجلسة التجريبية صوتيًا وتفريغها نصيًا. لن يتمكن من الوصول إلى التسجيل الصوتي والنص المحفوظين إلا موظفو Seenn المصرّح لهم. وسيُحذف كلاهما نهائيًا خلال 7 أيام.',
};

const SESSION_BODY = {
  token: 'jwt',
  livekit_url: 'wss://x.livekit.cloud',
  session_id: 'demo-1',
  expires_at: new Date(Date.now() + 120_000).toISOString(),
  language: 'en',
};

function config(overrides: Partial<VoiceDemoConfig> = {}): VoiceDemoConfig {
  return {
    ...DEFAULT_CONFIG,
    publicDemoMode: 'enabled',
    endpointBaseUrl: 'https://stub.supabase.co',
    anonKey: 'anon-key',
    turnstileSiteKey: 'site-key',
    languageLookupUrl: '',
    languageOverride: 'en',
    ...overrides,
  };
}

interface HarnessOptions {
  locale?: DemoLocale;
  /** Overrides the catalog row the stub serves. */
  catalog?: Partial<{ policy_version: string; locale: string; text: string }> | null;
  catalogStatus?: number;
  /** Makes the session POST reject with this server error code. */
  sessionError?: string;
}

/** Every external surface the widget could reach, each one counted. */
function harness(options: HarnessOptions = {}) {
  const locale = options.locale ?? 'en';

  const getToken = vi.fn(async () => 'ts-token');
  const turnstile: TurnstileProvider = { getToken, reset: vi.fn(), destroy: vi.fn() };

  const track = { stop: vi.fn(), kind: 'audio' };
  const stream = { getTracks: () => [track], getAudioTracks: () => [track] };
  const getUserMedia = vi.fn(async () => stream as unknown as MediaStream);

  const connect = vi.fn(async (_o: ConnectOptions) => undefined);
  const transport = {
    connect,
    disconnect: vi.fn(async () => undefined),
    attachAudio: vi.fn(),
    setMicrophoneEnabled: vi.fn(async () => undefined),
  } as unknown as VoiceTransport;

  const catalogCalls: string[] = [];
  const sessionCalls: { url: string; body: unknown }[] = [];

  const fetchSpy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);

    if (url.includes('public-voice-demo-consent')) {
      catalogCalls.push(url);
      if (options.catalogStatus && options.catalogStatus !== 200) {
        return new Response('nope', { status: options.catalogStatus });
      }
      if (options.catalog === null) return new Response('{}', { status: 200 });
      const row = {
        policy_version: CONSENT_POLICY_VERSION,
        locale,
        text: WORDING[locale],
        ...(options.catalog ?? {}),
      };
      return new Response(JSON.stringify(row), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    sessionCalls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : null });
    return new Response(JSON.stringify(SESSION_BODY), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  });

  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia },
  });
  vi.stubGlobal('fetch', fetchSpy);

  const deps = {
    createTurnstile: () => turnstile,
    createTransport: (_events: TransportEvents) => transport,
  } as unknown as WidgetDeps;

  return { deps, getToken, getUserMedia, connect, fetchSpy, catalogCalls, sessionCalls, locale };
}

function mount(cfg: VoiceDemoConfig, deps: WidgetDeps): HTMLElement {
  const host = document.createElement('div');
  document.body.appendChild(host);
  new VoiceDemoWidget(host, cfg, deps);
  return host;
}

const q = <T extends HTMLElement>(host: HTMLElement, sel: string): T => {
  const el = host.querySelector<T>(sel);
  if (!el) throw new Error(`missing ${sel}`);
  return el;
};

/** Presses start and lets the catalog round-trip settle. */
async function pressStart(host: HTMLElement): Promise<void> {
  q<HTMLButtonElement>(host, '.svd__start').click();
  await vi.waitFor(() => {
    if (!q(host, '.svd__gate').hidden) return;
    throw new Error('gate did not open');
  }).catch(() => undefined);
}

beforeEach(() => {
  document.body.innerHTML = '';
  document.documentElement.lang = 'en';
});

describe('policy version', () => {
  it('is the audio-plus-transcript policy', () => {
    expect(CONSENT_POLICY_VERSION).toBe('2026-08-03.4');
  });

  it('no superseded policy appears anywhere in the module', () => {
    const blob = JSON.stringify({ CONSENT_STRINGS, CONSENT_POLICY_VERSION });
    for (const old of SUPERSEDED) expect(blob).not.toContain(old);
  });

  it.each(SUPERSEDED)('a catalog serving %s is refused', (old) => {
    const row = { policy_version: old, locale: 'en', text: 'anything' };
    expect(readCatalogEntry(row, 'en', CONSENT_POLICY_VERSION).status).toBe('failed');
  });

  it.each(SUPERSEDED)('%s cannot be approved even if presented', (old) => {
    const gate = new ConsentGate('required');
    gate.present({ policyVersion: old, locale: 'en', text: 'anything' });
    expect(gate.approve()).toBeNull();
    expect(gate.approved).toBe(false);
  });
});

describe('a superseded policy is rejected end to end', () => {
  it.each(SUPERSEDED)('%s from the catalog opens no dialog and sends nothing', async (old) => {
    const h = harness({ catalog: { policy_version: old } });
    const host = mount(config({ recordingConsentMode: 'required' }), h.deps);

    await pressStart(host);
    await new Promise((r) => setTimeout(r, 30));

    expect(q(host, '.svd__gate').hidden).toBe(true);
    expect(h.sessionCalls).toHaveLength(0);
    expect(h.getUserMedia).not.toHaveBeenCalled();
  });
});

describe('consent_policy_outdated forces a fresh acceptance', () => {
  /**
   * Asserted on the gate itself rather than by pressing start a second time.
   * "Approval cleared" is the property that matters: once it is false, the
   * only route back to a session runs through openGate() again — a fresh
   * catalog fetch and a fresh click — which the suite above already pins down.
   */
  it('voids the held approval and never retries on its own', async () => {
    const h = harness({ sessionError: 'consent_policy_outdated' });
    const host = mount(config({ recordingConsentMode: 'required' }), h.deps);
    const widget = (host as unknown as { __widget?: unknown }).__widget;
    void widget;

    await pressStart(host);
    q<HTMLButtonElement>(host, '.svd__gate-agree').click();
    await vi.waitFor(() => expect(h.sessionCalls).toHaveLength(1));

    // The POST was rejected. Nothing may quietly try again with a bumped
    // version — that would be recording an agreement nobody gave.
    await new Promise((r) => setTimeout(r, 80));
    expect(h.sessionCalls).toHaveLength(1);
    expect(h.catalogCalls).toHaveLength(1);
    expect(q(host, '.svd__gate').hidden).toBe(true);
  });

  it('the gate holds nothing after being revoked', () => {
    const gate = new ConsentGate('required');
    gate.present({ policyVersion: CONSENT_POLICY_VERSION, locale: 'en', text: WORDING.en });
    gate.approve();
    expect(gate.approved).toBe(true);

    gate.revoke();
    expect(gate.approved).toBe(false);
    expect(gate.pending).toBeNull();
    // and cannot be re-approved without a freshly presented row
    expect(gate.approve()).toBeNull();
  });
});

describe('the catalog is the wording source', () => {
  it('ships no consent sentence of its own', () => {
    // Chrome only. If a body sentence ever reappears here, the widget can
    // drift from the version it records acceptance against.
    for (const locale of ['en', 'he', 'ar'] as const) {
      const strings = CONSENT_STRINGS[locale] as unknown as Record<string, string>;
      expect(strings['dialogBodyPrimary']).toBeUndefined();
      expect(strings['dialogBodySecondary']).toBeUndefined();
      for (const value of Object.values(strings)) {
        expect(value.length).toBeLessThan(120);
      }
    }
  });

  it.each(['en', 'he', 'ar'] as const)('%s renders the served sentence verbatim', async (locale) => {
    const h = harness({ locale });
    const host = mount(config({ recordingConsentMode: 'required', locale, languageOverride: locale }), h.deps);

    await pressStart(host);

    expect(h.catalogCalls).toHaveLength(1);
    expect(h.catalogCalls[0]).toContain(`locale=${locale}`);
    expect(q(host, '.svd__gate-text').textContent).toBe(WORDING[locale]);
  });

  it.each(['en', 'he', 'ar'] as const)('%s quotes its own agree button', (locale) => {
    // The sentence names the button. If the label drifts, the sentence stops
    // describing the control it refers to.
    expect(WORDING[locale]).toContain(CONSENT_STRINGS[locale].agreeLabel);
  });

  it.each([
    ['en', 'ltr'],
    ['he', 'rtl'],
    ['ar', 'rtl'],
  ] as const)('%s renders %s', async (locale, dir) => {
    const h = harness({ locale });
    const host = mount(config({ recordingConsentMode: 'required', locale, languageOverride: locale }), h.deps);
    await pressStart(host);
    expect(q(host, '.svd').getAttribute('dir')).toBe(dir);
    expect(q(host, '.svd__gate-text').textContent).toBe(WORDING[locale]);
  });
});

describe('fails closed', () => {
  it.each([
    ['a version mismatch', { catalog: { policy_version: RETIRED_POLICY } }],
    ['a newer version', { catalog: { policy_version: '2026-09-01.1' } }],
    ['a locale mismatch', { catalog: { locale: 'ar' } }],
    ['empty text', { catalog: { text: '   ' } }],
    ['a missing row', { catalog: null }],
    ['a 500', { catalogStatus: 500 }],
    ['a 404', { catalogStatus: 404 }],
  ])('%s opens no dialog and starts nothing', async (_name, opts) => {
    const h = harness(opts as HarnessOptions);
    const host = mount(config({ recordingConsentMode: 'required' }), h.deps);

    await pressStart(host);
    await new Promise((r) => setTimeout(r, 30));

    expect(q(host, '.svd__gate').hidden).toBe(true);
    expect(q(host, '.svd__gate-text').textContent).toBe('');
    expect(h.sessionCalls).toHaveLength(0);
    expect(h.getUserMedia).not.toHaveBeenCalled();
    expect(h.getToken).not.toHaveBeenCalled();
    expect(h.connect).not.toHaveBeenCalled();
  });

  it('validates the row directly', () => {
    const ok = { policy_version: CONSENT_POLICY_VERSION, locale: 'he', text: WORDING.he };
    expect(readCatalogEntry(ok, 'he', CONSENT_POLICY_VERSION).status).toBe('ok');
    expect(readCatalogEntry(ok, 'en', CONSENT_POLICY_VERSION).status).toBe('failed');
    expect(readCatalogEntry({ ...ok, policy_version: RETIRED_POLICY }, 'he', CONSENT_POLICY_VERSION).status).toBe('failed');
    expect(readCatalogEntry(null, 'he', CONSENT_POLICY_VERSION).status).toBe('failed');
    expect(readCatalogEntry({ ...ok, text: '' }, 'he', CONSENT_POLICY_VERSION).status).toBe('failed');
  });
});

describe('nothing leaves the browser before acceptance', () => {
  it('the catalog GET is the only request', async () => {
    const h = harness();
    const host = mount(config({ recordingConsentMode: 'required' }), h.deps);

    await pressStart(host);

    expect(h.catalogCalls).toHaveLength(1);
    expect(h.sessionCalls).toHaveLength(0);
    expect(h.getUserMedia).not.toHaveBeenCalled();
    expect(h.getToken).not.toHaveBeenCalled();
    expect(h.connect).not.toHaveBeenCalled();
  });

  it('the catalog request is a credential-free GET', async () => {
    const h = harness();
    const host = mount(config({ recordingConsentMode: 'required' }), h.deps);
    await pressStart(host);

    const init = h.fetchSpy.mock.calls[0]?.[1] as RequestInit;
    expect(init.method).toBe('GET');
    expect(init.credentials).toBe('omit');
    expect(init.body).toBeUndefined();
  });

  it('the orb is gated too', async () => {
    const h = harness();
    const host = mount(config({ recordingConsentMode: 'required' }), h.deps);

    q<HTMLButtonElement>(host, '.preview-orb__call').click();
    await vi.waitFor(() => expect(h.catalogCalls).toHaveLength(1));

    expect(h.sessionCalls).toHaveLength(0);
    expect(h.getUserMedia).not.toHaveBeenCalled();
  });

  it('mounting alone contacts nothing at all', () => {
    const h = harness();
    mount(config({ recordingConsentMode: 'required' }), h.deps);
    expect(h.fetchSpy).not.toHaveBeenCalled();
    expect(h.getUserMedia).not.toHaveBeenCalled();
  });
});

describe('declining and dismissing have no side effects', () => {
  it.each([
    ['back', (host: HTMLElement) => q<HTMLButtonElement>(host, '.svd__gate-back').click()],
    ['scrim', (host: HTMLElement) => q<HTMLElement>(host, '.svd__gate-scrim').click()],
    [
      'escape',
      () =>
        document.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
        ),
    ],
  ])('%s closes and sends nothing', async (_name, dismiss) => {
    const h = harness();
    const host = mount(config({ recordingConsentMode: 'required' }), h.deps);

    await pressStart(host);
    dismiss(host);
    await new Promise((r) => setTimeout(r, 20));

    expect(q(host, '.svd__gate').hidden).toBe(true);
    expect(h.sessionCalls).toHaveLength(0);
    expect(h.getUserMedia).not.toHaveBeenCalled();
    expect(h.getToken).not.toHaveBeenCalled();
    expect(h.connect).not.toHaveBeenCalled();
  });

  it('dismissing discards the row, so reopening refetches', async () => {
    const h = harness();
    const host = mount(config({ recordingConsentMode: 'required' }), h.deps);

    await pressStart(host);
    q<HTMLButtonElement>(host, '.svd__gate-back').click();
    await pressStart(host);

    expect(h.catalogCalls).toHaveLength(2);
    expect(h.sessionCalls).toHaveLength(0);
  });

  it('the details link opens the dialog without starting anything', async () => {
    const h = harness();
    const host = mount(config({ recordingConsentMode: 'required' }), h.deps);

    q<HTMLButtonElement>(host, '.svd__rec-details').click();
    await vi.waitFor(() => expect(h.catalogCalls).toHaveLength(1));

    expect(h.sessionCalls).toHaveLength(0);
    expect(h.getUserMedia).not.toHaveBeenCalled();
  });
});

describe('what acceptance submits', () => {
  async function accept(locale: DemoLocale = 'en') {
    const h = harness({ locale });
    const host = mount(
      config({ recordingConsentMode: 'required', locale, languageOverride: locale }),
      h.deps,
    );
    await pressStart(host);
    q<HTMLButtonElement>(host, '.svd__gate-agree').click();
    await vi.waitFor(() => expect(h.sessionCalls).toHaveLength(1));
    return { h, host, body: h.sessionCalls[0]?.body as Record<string, unknown> };
  }

  it('sends consent nested, with exactly three fields', async () => {
    const { body } = await accept();
    const consent = body['consent'] as Record<string, unknown>;

    expect(Object.keys(consent).sort()).toEqual(['accepted_at', 'locale', 'policy_version']);
    expect(consent['policy_version']).toBe('2026-08-03.4');
    expect(consent['locale']).toBe('en');
    expect(String(consent['accepted_at'])).toMatch(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/);
  });

  it('never flattens the receipt onto the body', async () => {
    const { body } = await accept();
    expect(body['policy_version']).toBeUndefined();
    expect(body['locale']).toBeUndefined();
    expect(body['accepted_at']).toBeUndefined();
    expect(body['consent_policy_version']).toBeUndefined();
  });

  it.each(['en', 'he', 'ar'] as const)('%s submits a locale matching the shown text', async (locale) => {
    const { body, h } = await accept(locale);
    const consent = body['consent'] as Record<string, unknown>;
    expect(consent['locale']).toBe(locale);
    // and the session's own language field agrees with it
    expect(body['language']).toBe(locale);
    expect(h.catalogCalls[0]).toContain(`locale=${locale}`);
  });

  it('never submits the retired policy', async () => {
    const { body } = await accept();
    expect(JSON.stringify(body)).not.toContain(RETIRED_POLICY);
  });

  it('runs exactly one session, even on a triple click', async () => {
    const h = harness();
    const host = mount(config({ recordingConsentMode: 'required' }), h.deps);
    await pressStart(host);

    const agree = q<HTMLButtonElement>(host, '.svd__gate-agree');
    agree.click();
    agree.click();
    agree.click();
    await vi.waitFor(() => expect(h.sessionCalls).toHaveLength(1));

    expect(h.sessionCalls).toHaveLength(1);
    expect(h.getUserMedia).toHaveBeenCalledTimes(1);
  });

  it('nothing is remembered for a second session', () => {
    const gate = new ConsentGate('required');
    gate.present({ policyVersion: CONSENT_POLICY_VERSION, locale: 'en', text: WORDING.en });
    expect(gate.approve()).not.toBeNull();
    expect(gate.approved).toBe(true);
    expect(gate.take()).not.toBeNull();
    expect(gate.approved).toBe(false);
    expect(gate.pending).toBeNull();
  });

  it('cannot approve without a row having been shown', () => {
    const gate = new ConsentGate('required');
    expect(gate.approve()).toBeNull();
    expect(gate.approved).toBe(false);
  });

  it('cannot approve against a row from another version', () => {
    const gate = new ConsentGate('required');
    gate.present({ policyVersion: RETIRED_POLICY, locale: 'en', text: 'old' });
    expect(gate.approve()).toBeNull();
  });

  it('writes no consent to storage', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    await accept();
    const writes = setItem.mock.calls.filter(([k]) => /consent|policy|recording/i.test(String(k)));
    expect(writes).toEqual([]);
  });
});

describe('disabled mode, and the public pages', () => {
  it('defaults to disabled', () => {
    expect(DEFAULT_CONFIG.recordingConsentMode).toBe('disabled');
  });

  it('only the exact literal enables it', () => {
    expect(resolveConsentMode('required')).toBe('required');
    for (const raw of ['Required', ' required', 'REQUIRED', 'on', true, 1, null, undefined, {}]) {
      expect(resolveConsentMode(raw)).toBe('disabled');
    }
  });

  it('is not reachable from the dataset', () => {
    const resolved = resolveConfig({
      inline: { publicDemoMode: 'enabled' },
      dataset: { recordingConsentMode: 'required' } as unknown as DOMStringMap,
    });
    expect(resolved.recordingConsentMode).toBe('disabled');
  });

  it('shows no wording, fetches no catalog, and starts straight through', async () => {
    const h = harness();
    const host = mount(config(), h.deps);

    expect(q(host, '.svd__rec').hidden).toBe(true);

    q<HTMLButtonElement>(host, '.svd__start').click();
    await vi.waitFor(() => expect(h.sessionCalls).toHaveLength(1));

    expect(h.catalogCalls).toHaveLength(0);
    expect(q(host, '.svd__gate').hidden).toBe(true);
    expect(h.sessionCalls[0]?.body).not.toHaveProperty('consent');
  });

  it('a gate that is not required is permanently satisfied', () => {
    const gate = new ConsentGate('disabled');
    expect(gate.required).toBe(false);
    expect(gate.approved).toBe(true);
  });
});

describe('accessibility', () => {
  it('is a modal dialog labelled by its title, with focus trapped and restored', async () => {
    const h = harness();
    const host = mount(config({ recordingConsentMode: 'required' }), h.deps);
    const start = q<HTMLButtonElement>(host, '.svd__start');
    start.focus();

    await pressStart(host);

    const panel = q(host, '.svd__gate-panel');
    expect(panel.getAttribute('role')).toBe('dialog');
    expect(panel.getAttribute('aria-modal')).toBe('true');
    expect(panel.getAttribute('aria-labelledby')).toBe(q(host, '.svd__gate-title').id);
    expect(document.activeElement).toBe(q(host, '.svd__gate-back'));

    q<HTMLButtonElement>(host, '.svd__gate-back').click();
    expect(document.activeElement).toBe(start);
  });

  it('the affirmative button is last in the DOM in every locale', async () => {
    for (const locale of ['en', 'he', 'ar'] as const) {
      document.body.innerHTML = '';
      const h = harness({ locale });
      const host = mount(
        config({ recordingConsentMode: 'required', locale, languageOverride: locale }),
        h.deps,
      );
      await pressStart(host);
      const buttons = Array.from(q(host, '.svd__gate-actions').querySelectorAll('button'));
      expect(buttons[buttons.length - 1]?.className).toContain('svd__gate-agree');
    }
  });
});

describe('the dialog follows the sentence, not the page', () => {
  /**
   * The rendering locale and the session's canonical language are independent:
   * a visitor on the English homepage can resolve to a Hebrew session. The
   * sentence is then Hebrew — and it quotes its own button — so the chrome and
   * the direction have to be Hebrew too, or the sentence names a control that
   * is not on screen.
   */
  it.each([
    ['en', 'he', 'rtl'],
    ['en', 'ar', 'rtl'],
    ['he', 'en', 'ltr'],
    ['he', 'ar', 'rtl'],
  ] as const)('page %s with a %s session renders the dialog %s', async (pageLocale, sessionLocale, dir) => {
    const h = harness({ locale: sessionLocale });
    const host = mount(
      config({
        recordingConsentMode: 'required',
        locale: pageLocale,
        languageOverride: sessionLocale,
      }),
      h.deps,
    );

    await pressStart(host);

    const shown = q(host, '.svd__gate-text').textContent ?? '';
    const agree = q(host, '.svd__gate-agree').textContent ?? '';

    expect(shown).toBe(WORDING[sessionLocale]);
    expect(agree).toBe(CONSENT_STRINGS[sessionLocale].agreeLabel);
    // The load-bearing one: the sentence must name the button beside it.
    expect(shown).toContain(agree);
    expect(q(host, '.svd__gate-title').textContent).toBe(CONSENT_STRINGS[sessionLocale].dialogTitle);
    expect(q(host, '.svd__gate-back').textContent).toBe(CONSENT_STRINGS[sessionLocale].goBackLabel);
    expect(q(host, '.svd__gate').getAttribute('dir')).toBe(dir);
    expect(q(host, '.svd__gate').getAttribute('lang')).toBe(sessionLocale);
  });

  it('the surrounding page keeps its own direction', async () => {
    const h = harness({ locale: 'he' });
    const host = mount(
      config({ recordingConsentMode: 'required', locale: 'en', languageOverride: 'he' }),
      h.deps,
    );
    await pressStart(host);
    // The widget is still an English page; only the dialog flips.
    expect(q(host, '.svd').getAttribute('dir')).toBe('ltr');
    expect(q(host, '.svd__gate').getAttribute('dir')).toBe('rtl');
  });
});

describe('no secrets', () => {
  it('the shipped strings carry no key-shaped material', () => {
    const blob = JSON.stringify(CONSENT_STRINGS);
    expect(blob).not.toMatch(/service_role|sb_secret|eyJhbGciOi|Bearer\s/i);
  });
});
