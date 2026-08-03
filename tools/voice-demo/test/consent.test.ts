/**
 * Pre-flight recording consent.
 *
 * The load-bearing assertions here are the negative ones: before a visitor
 * agrees, nothing may touch a microphone, Turnstile, Supabase or LiveKit. A
 * gate that renders correctly but lets a request slip through is worse than no
 * gate, so most of this file is about what did NOT happen.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VoiceDemoWidget } from '../src/widget';
import { DEFAULT_CONFIG, resolveConfig } from '../src/config';
import {
  CONSENT_STRINGS,
  ConsentGate,
  RECORDING_POLICY_VERSION,
  resolveConsentMode,
} from '../src/consent';
import type { VoiceDemoConfig } from '../src/config';
import type { WidgetDeps } from '../src/widget';
import type { ConnectOptions, TransportEvents, VoiceTransport } from '../src/transport';
import type { TurnstileProvider } from '../src/turnstile';

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

/** Every external surface the widget could reach, each one counted. */
function spies() {
  const getToken = vi.fn(async () => 'ts-token');
  const turnstile: TurnstileProvider = { getToken, reset: vi.fn(), destroy: vi.fn() };

  const track = { stop: vi.fn(), kind: 'audio' };
  const stream = { getTracks: () => [track], getAudioTracks: () => [track] };
  const getUserMedia = vi.fn(async () => stream as unknown as MediaStream);

  const connect = vi.fn(async (_o: ConnectOptions) => undefined);
  let captured: TransportEvents | null = null;
  const transport: VoiceTransport = {
    connect,
    disconnect: vi.fn(async () => undefined),
    attachAudio: vi.fn(),
    setMicrophoneEnabled: vi.fn(async () => undefined),
  } as unknown as VoiceTransport;

  const fetchSpy = vi.fn(async () =>
    new Response(JSON.stringify(SESSION_BODY), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  );

  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia },
  });
  vi.stubGlobal('fetch', fetchSpy);

  const deps: WidgetDeps = {
    createTurnstile: () => turnstile,
    createTransport: (events: TransportEvents) => {
      captured = events;
      return transport;
    },
  } as unknown as WidgetDeps;

  return { deps, getToken, getUserMedia, connect, fetchSpy, events: () => captured };
}

function mount(cfg: VoiceDemoConfig, deps: WidgetDeps): { host: HTMLElement } {
  const host = document.createElement('div');
  document.body.appendChild(host);
  new VoiceDemoWidget(host, cfg, deps);
  return { host };
}

const q = <T extends HTMLElement>(host: HTMLElement, sel: string): T => {
  const el = host.querySelector<T>(sel);
  if (!el) throw new Error(`missing ${sel}`);
  return el;
};

beforeEach(() => {
  document.body.innerHTML = '';
  document.documentElement.lang = 'en';
});

describe('consent mode resolution', () => {
  it('defaults to disabled', () => {
    expect(DEFAULT_CONFIG.recordingConsentMode).toBe('disabled');
  });

  it('only the exact literal "required" turns it on', () => {
    expect(resolveConsentMode('required')).toBe('required');
    for (const raw of ['Required', ' required', 'REQUIRED', 'on', true, 1, null, undefined, {}]) {
      expect(resolveConsentMode(raw)).toBe('disabled');
    }
  });

  it('is not reachable from the dataset or the URL', () => {
    const resolved = resolveConfig({
      inline: { publicDemoMode: 'enabled' },
      dataset: { recordingConsentMode: 'required' } as unknown as DOMStringMap,
    });
    expect(resolved.recordingConsentMode).toBe('disabled');
  });
});

describe('1. no consent means no external contact', () => {
  it('pressing start opens the dialog and reaches nothing', async () => {
    const s = spies();
    const { host } = mount(config({ recordingConsentMode: 'required' }), s.deps);

    q<HTMLButtonElement>(host, '.svd__start').click();
    await Promise.resolve();

    expect(q(host, '.svd__gate').hidden).toBe(false);
    expect(s.getUserMedia).not.toHaveBeenCalled();
    expect(s.getToken).not.toHaveBeenCalled();
    expect(s.fetchSpy).not.toHaveBeenCalled();
    expect(s.connect).not.toHaveBeenCalled();
  });

  it('the orb is gated too, not just the labelled button', async () => {
    const s = spies();
    const { host } = mount(config({ recordingConsentMode: 'required' }), s.deps);

    q<HTMLButtonElement>(host, '.preview-orb__call').click();
    await Promise.resolve();

    expect(q(host, '.svd__gate').hidden).toBe(false);
    expect(s.getUserMedia).not.toHaveBeenCalled();
    expect(s.fetchSpy).not.toHaveBeenCalled();
  });
});

describe('2. dismissing starts nothing', () => {
  it.each([
    ['back button', (host: HTMLElement) => q<HTMLButtonElement>(host, '.svd__gate-back').click()],
    ['scrim', (host: HTMLElement) => q<HTMLElement>(host, '.svd__gate-scrim').click()],
    [
      'escape',
      () =>
        document.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
        ),
    ],
  ])('%s closes and contacts nothing', async (_name, dismiss) => {
    const s = spies();
    const { host } = mount(config({ recordingConsentMode: 'required' }), s.deps);

    q<HTMLButtonElement>(host, '.svd__start').click();
    await Promise.resolve();
    dismiss(host);
    await Promise.resolve();

    expect(q(host, '.svd__gate').hidden).toBe(true);
    expect(s.getUserMedia).not.toHaveBeenCalled();
    expect(s.getToken).not.toHaveBeenCalled();
    expect(s.fetchSpy).not.toHaveBeenCalled();
    expect(s.connect).not.toHaveBeenCalled();
  });

  it('the details link opens the dialog without starting anything', async () => {
    const s = spies();
    const { host } = mount(config({ recordingConsentMode: 'required' }), s.deps);

    q<HTMLButtonElement>(host, '.svd__rec-details').click();
    await Promise.resolve();

    expect(q(host, '.svd__gate').hidden).toBe(false);
    expect(s.getUserMedia).not.toHaveBeenCalled();
    expect(s.fetchSpy).not.toHaveBeenCalled();
  });
});

describe('3 & 4. approval starts exactly one session', () => {
  it('agreeing runs the normal flow once', async () => {
    const s = spies();
    const { host } = mount(config({ recordingConsentMode: 'required' }), s.deps);

    q<HTMLButtonElement>(host, '.svd__start').click();
    await Promise.resolve();
    q<HTMLButtonElement>(host, '.svd__gate-agree').click();
    await vi.waitFor(() => expect(s.fetchSpy).toHaveBeenCalled());

    expect(s.getUserMedia).toHaveBeenCalledTimes(1);
    expect(s.fetchSpy).toHaveBeenCalledTimes(1);
    expect(q(host, '.svd__gate').hidden).toBe(true);
  });

  it('double-clicking agree cannot create two sessions', async () => {
    const s = spies();
    const { host } = mount(config({ recordingConsentMode: 'required' }), s.deps);

    q<HTMLButtonElement>(host, '.svd__start').click();
    await Promise.resolve();
    const agree = q<HTMLButtonElement>(host, '.svd__gate-agree');
    agree.click();
    agree.click();
    agree.click();
    await vi.waitFor(() => expect(s.fetchSpy).toHaveBeenCalled());

    expect(s.fetchSpy).toHaveBeenCalledTimes(1);
    expect(s.getUserMedia).toHaveBeenCalledTimes(1);
  });

  it('consent covers one session only — it is not retained', () => {
    const gate = new ConsentGate('required', 'en');
    gate.approve();
    expect(gate.approved).toBe(true);
    expect(gate.take()).not.toBeNull();
    expect(gate.approved).toBe(false);
  });

  it('never writes consent to localStorage', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const s = spies();
    const { host } = mount(config({ recordingConsentMode: 'required' }), s.deps);

    q<HTMLButtonElement>(host, '.svd__start').click();
    await Promise.resolve();
    q<HTMLButtonElement>(host, '.svd__gate-agree').click();
    await vi.waitFor(() => expect(s.fetchSpy).toHaveBeenCalled());

    const consentWrites = setItem.mock.calls.filter(([key]) => /consent|recording|policy/i.test(String(key)));
    expect(consentWrites).toEqual([]);
  });
});

describe('5. wording is exact in all three languages', () => {
  const EXPECTED = {
    en: {
      disclosure: 'This demo is recorded and transcribed, then automatically deleted after 7 days',
      details: 'Details',
      title: 'Before we begin',
      primary: 'This demo is recorded and transcribed for review and improvement.',
      secondary: 'The recording and transcript are automatically deleted after 7 days.',
      privacy: 'Privacy policy',
      back: 'Go back',
      agree: 'Agree and start',
    },
    he: {
      disclosure: 'ההדגמה מוקלטת ומתומללת ונמחקת אוטומטית לאחר 7 ימים',
      details: 'פרטים',
      title: 'לפני שמתחילים',
      primary: 'ההדגמה מוקלטת ומתומללת לצורכי בדיקה ושיפור.',
      secondary: 'ההקלטה והתמלול נמחקים אוטומטית לאחר 7 ימים.',
      privacy: 'מדיניות פרטיות',
      back: 'חזרה',
      agree: 'מאשרים ומתחילים',
    },
    ar: {
      disclosure: 'يتم تسجيل العرض التجريبي وتفريغه نصيًا، ويُحذف تلقائيًا بعد 7 أيام',
      details: 'التفاصيل',
      title: 'قبل أن نبدأ',
      primary: 'يتم تسجيل العرض التجريبي وتفريغه نصيًا لأغراض المراجعة والتحسين.',
      secondary: 'يُحذف التسجيل والنص تلقائيًا بعد 7 أيام.',
      privacy: 'سياسة الخصوصية',
      back: 'رجوع',
      agree: 'موافقة وبدء',
    },
  } as const;

  it.each(['en', 'he', 'ar'] as const)('%s strings match the approved copy', (locale) => {
    const s = CONSENT_STRINGS[locale];
    const e = EXPECTED[locale];
    expect(s.disclosure).toBe(e.disclosure);
    expect(s.detailsLabel).toBe(e.details);
    expect(s.dialogTitle).toBe(e.title);
    expect(s.dialogBodyPrimary).toBe(e.primary);
    expect(s.dialogBodySecondary).toBe(e.secondary);
    expect(s.privacyLabel).toBe(e.privacy);
    expect(s.goBackLabel).toBe(e.back);
    expect(s.agreeLabel).toBe(e.agree);
  });

  it.each(['en', 'he', 'ar'] as const)('%s renders that copy into the DOM', (locale) => {
    const s = spies();
    const { host } = mount(config({ recordingConsentMode: 'required', locale }), s.deps);
    const e = EXPECTED[locale];

    expect(q(host, '.svd__rec-text').textContent).toBe(e.disclosure);
    expect(q(host, '.svd__rec-details').textContent).toBe(e.details);
    expect(q(host, '.svd__gate-title').textContent).toBe(e.title);
    expect(q(host, '.svd__gate-line--primary').textContent).toBe(e.primary);
    expect(q(host, '.svd__gate-line--secondary').textContent).toBe(e.secondary);
    expect(q(host, '.svd__gate-policy').textContent).toBe(e.privacy);
    expect(q(host, '.svd__gate-back').textContent).toBe(e.back);
    expect(q(host, '.svd__gate-agree').textContent).toBe(e.agree);
  });
});

describe('6. direction and button order', () => {
  it.each([
    ['en', 'ltr'],
    ['he', 'rtl'],
    ['ar', 'rtl'],
  ] as const)('%s renders %s', (locale, dir) => {
    const s = spies();
    const { host } = mount(config({ recordingConsentMode: 'required', locale }), s.deps);
    expect(q(host, '.svd').getAttribute('dir')).toBe(dir);
  });

  it('the affirmative button is last in the DOM in every locale', () => {
    for (const locale of ['en', 'he', 'ar'] as const) {
      document.body.innerHTML = '';
      const s = spies();
      const { host } = mount(config({ recordingConsentMode: 'required', locale }), s.deps);
      const actions = q(host, '.svd__gate-actions');
      const buttons = Array.from(actions.querySelectorAll('button'));
      // Order is expressed once, in the DOM; direction is CSS's job, so the
      // affirmative control stays last for a screen reader in both directions.
      expect(buttons[buttons.length - 1]?.className).toContain('svd__gate-agree');
    }
  });
});

describe('7 & 8. approval is scoped to locale and policy version', () => {
  it('changing locale invalidates a held approval', () => {
    const gate = new ConsentGate('required', 'en');
    gate.approve();
    expect(gate.approved).toBe(true);
    gate.setLocale('he');
    expect(gate.approved).toBe(false);
  });

  it('an approval from another policy version does not count', () => {
    const gate = new ConsentGate('required', 'en', 'v-old');
    gate.approve();
    const receipt = gate.take();
    expect(receipt?.policyVersion).toBe('v-old');

    const current = new ConsentGate('required', 'en', RECORDING_POLICY_VERSION);
    expect(current.approved).toBe(false);
  });

  it('the receipt carries the version, locale and an ISO timestamp', () => {
    const gate = new ConsentGate('required', 'he');
    const receipt = gate.approve(new Date('2026-08-03T10:00:00.000Z'));
    expect(receipt).toEqual({
      policyVersion: RECORDING_POLICY_VERSION,
      locale: 'he',
      acceptedAt: '2026-08-03T10:00:00.000Z',
    });
  });
});

describe('9. disabled mode is the current live behaviour', () => {
  it('shows no recording wording and no dialog', () => {
    const s = spies();
    const { host } = mount(config(), s.deps);
    expect(q(host, '.svd__rec').hidden).toBe(true);
    expect(q(host, '.svd__gate').hidden).toBe(true);
  });

  it('start goes straight through, exactly as it does today', async () => {
    const s = spies();
    const { host } = mount(config(), s.deps);

    q<HTMLButtonElement>(host, '.svd__start').click();
    await vi.waitFor(() => expect(s.fetchSpy).toHaveBeenCalled());

    expect(q(host, '.svd__gate').hidden).toBe(true);
    expect(s.getUserMedia).toHaveBeenCalledTimes(1);
    expect(s.fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('a gate that is not required is permanently satisfied', () => {
    const gate = new ConsentGate('disabled', 'en');
    expect(gate.required).toBe(false);
    expect(gate.approved).toBe(true);
  });
});

describe('10. nothing happens before a gesture', () => {
  it('mounting with consent required contacts nothing', () => {
    const s = spies();
    mount(config({ recordingConsentMode: 'required' }), s.deps);

    expect(s.getUserMedia).not.toHaveBeenCalled();
    expect(s.getToken).not.toHaveBeenCalled();
    expect(s.fetchSpy).not.toHaveBeenCalled();
    expect(s.connect).not.toHaveBeenCalled();
  });
});

describe('11. no secrets in the shipped strings', () => {
  it('consent copy carries no key-shaped material', () => {
    const blob = JSON.stringify(CONSENT_STRINGS);
    expect(blob).not.toMatch(/service_role|sb_secret|eyJhbGciOi|Bearer\s/i);
  });
});

describe('accessibility of the dialog', () => {
  it('is a modal dialog labelled by its own title', async () => {
    const s = spies();
    const { host } = mount(config({ recordingConsentMode: 'required' }), s.deps);
    q<HTMLButtonElement>(host, '.svd__start').click();
    await Promise.resolve();

    const panel = q(host, '.svd__gate-panel');
    expect(panel.getAttribute('role')).toBe('dialog');
    expect(panel.getAttribute('aria-modal')).toBe('true');
    expect(panel.getAttribute('aria-labelledby')).toBe(q(host, '.svd__gate-title').id);
  });

  it('moves focus in on open and restores it on close', async () => {
    const s = spies();
    const { host } = mount(config({ recordingConsentMode: 'required' }), s.deps);
    const start = q<HTMLButtonElement>(host, '.svd__start');

    start.focus();
    start.click();
    await Promise.resolve();
    expect(host.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).toBe(q(host, '.svd__gate-back'));

    q<HTMLButtonElement>(host, '.svd__gate-back').click();
    await Promise.resolve();
    expect(document.activeElement).toBe(start);
  });

  it('traps Tab inside the panel', async () => {
    const s = spies();
    const { host } = mount(config({ recordingConsentMode: 'required' }), s.deps);
    q<HTMLButtonElement>(host, '.svd__start').click();
    await Promise.resolve();

    const agree = q<HTMLButtonElement>(host, '.svd__gate-agree');
    agree.focus();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
    );
    expect(document.activeElement).toBe(q(host, '.svd__gate-policy'));
  });
});
