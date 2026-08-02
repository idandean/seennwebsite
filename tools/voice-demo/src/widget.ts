/**
 * The widget: DOM, orchestration and lifecycle.
 *
 * Everything that can fail lives behind an injectable dependency
 * (`WidgetDeps`), so the tests drive the real state machine with a fake
 * microphone, a fake endpoint and a fake transport.
 */

import { PublicVoiceDemoClient, DemoRequestError, rateLimitScopeFor } from './client';
import { createTurnstileProvider } from './turnstile';
import { TransportError, createLiveKitTransport } from './transport';
import { readinessFor } from './agent';
import type { DemoLanguage } from './country-language';
import { directionFor, resolveLocale, stringsFor } from './i18n';
import { agentIsReady, initialContext, isActive, reduce } from './state';
import { logger } from './logging';
import { unavailableReason } from './config';
import type { VoiceDemoConfig } from './config';
import type { DemoLocale, RecordingConsent } from './contract';
import type { Strings } from './i18n';
import type { AnyErrorCode, DemoContext, DemoEvent, DemoState, FinishReason } from './state';
import type { TransportEvents, TransportFactory, TransportPhase, VoiceTransport } from './transport';
import type { TurnstileProvider } from './turnstile';

export interface WidgetDeps {
  createClient?: (config: VoiceDemoConfig) => PublicVoiceDemoClient;
  createTransport?: TransportFactory;
  /** Overridden in tests so no Cloudflare script is fetched. */
  createTurnstile?: (config: VoiceDemoConfig) => TurnstileProvider;
  /** Overridden in tests; the real one is getUserMedia. */
  requestMicrophone?: () => Promise<MediaStream>;
  now?: () => number;
}

/** Orb modifier per state — the ported orb's vocabulary, reused. */
const ORB_MODIFIER: Record<DemoState, string> = {
  unavailable: 'failed',
  ready: 'idle',
  requestingMicrophone: 'prompting',
  connecting: 'submitting',
  listening: 'dialing',
  assistantThinking: 'submitting',
  assistantSpeaking: 'dialing',
  reconnecting: 'submitting',
  finished: 'onTheWay',
  rateLimited: 'failed',
  error: 'failed',
};

const ICONS = {
  mic: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/>',
  hangUp: '<path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/><path d="M22 2 2 22"/>',
  spinner: '<path d="M21 12a9 9 0 1 1-6.22-8.56"/>',
  retry: '<path d="M3 10h6V4"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L3 10"/>',
  blocked: '<path d="M4.9 4.9 19.1 19.1"/><circle cx="12" cy="12" r="9"/>',
};

function icon(paths: string, className = ''): string {
  return (
    `<svg class="${className}" width="24" height="24" viewBox="0 0 24 24" fill="none" ` +
    `stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ` +
    `aria-hidden="true">${paths}</svg>`
  );
}

function mmss(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function track(event: string, params: Record<string, unknown> = {}): void {
  try {
    const gtag = (window as { gtag?: (...args: unknown[]) => void }).gtag;
    // No consent gate on this site: GA loads unconditionally and there is no
    // banner. If one is ever added, this is the single choke point.
    gtag?.('event', event, { event_category: 'voice_demo', ...params });
  } catch {
    // Analytics must never break the demo.
  }
}

export class VoiceDemoWidget {
  readonly mount: HTMLElement;

  private readonly config: VoiceDemoConfig;
  private readonly deps: WidgetDeps;
  private readonly client: PublicVoiceDemoClient;
  private readonly makeTransport: TransportFactory;
  private readonly now: () => number;

  private context: DemoContext;
  private locale: DemoLocale;
  private strings: Strings;

  private transport: VoiceTransport | null = null;
  private turnstile: TurnstileProvider | null = null;
  private microphone: MediaStream | null = null;
  private abortController: AbortController | null = null;
  private consentDecision: ((accepted: boolean) => void) | null = null;

  /**
   * Which leg of the real-time connection last failed. Reported to analytics
   * and the console so a future failure is diagnosable without a repro; never
   * shown to the visitor, and never carries a token or device detail.
   */
  private lastTransportPhase: TransportPhase | 'agent_readiness' | 'unknown' | null = null;

  /** The agent no-show timer, held separately so readiness can cancel it. */
  private agentTimeout: ReturnType<typeof setTimeout> | null = null;

  private timers: ReturnType<typeof setTimeout>[] = [];
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private deadline = 0;
  private destroyed = false;

  private root!: HTMLElement;
  private orb!: HTMLElement;
  private primaryButton!: HTMLButtonElement;
  private disconnectButton!: HTMLButtonElement;
  private headline!: HTMLElement;
  private body!: HTMLElement;
  private hint!: HTMLElement;
  private coreVideo: HTMLVideoElement | null = null;
  private startButton!: HTMLButtonElement;
  private sessionMeta!: HTMLElement;
  private consentPanel!: HTMLElement;
  private consentText!: HTMLElement;
  private consentLink!: HTMLAnchorElement;
  private consentAccept!: HTMLButtonElement;
  private consentDecline!: HTMLButtonElement;
  private supportPanel!: HTMLElement;
  private supportLabel!: HTMLElement;
  private supportValue!: HTMLElement;
  private supportCopy!: HTMLButtonElement;
  private ctaWrap!: HTMLElement;
  private ctaLink!: HTMLAnchorElement;
  private audioElement!: HTMLAudioElement;
  private liveRegion!: HTMLElement;

  private readonly onPageHide = (): void => {
    // A room that outlives the page keeps burning agent minutes.
    void this.disconnect('page_hidden');
  };

  private mountObserver: MutationObserver | null = null;

  constructor(mount: HTMLElement, config: VoiceDemoConfig, deps: WidgetDeps = {}) {
    this.mount = mount;
    this.config = config;
    this.deps = deps;
    this.now = deps.now ?? (() => Date.now());

    this.client =
      deps.createClient?.(config) ??
      new PublicVoiceDemoClient({
        baseUrl: config.endpointBaseUrl,
        anonKey: config.anonKey,
        path: config.endpointPath,
        // A configured site key makes the token mandatory, in the client, so
        // no code path can post without one.
        requireTurnstileToken: config.turnstileSiteKey !== '',
        now: this.now,
      });

    this.makeTransport =
      deps.createTransport ??
      ((events: TransportEvents) =>
        createLiveKitTransport(events, { moduleUrl: config.livekitModuleUrl }));

    this.locale = resolveLocale(config.locale, document.documentElement.getAttribute('lang'));
    this.strings = stringsFor(this.locale);
    this.context = initialContext(unavailableReason(config));

    this.build();
    this.render();
    this.watchLifecycle();
  }

  get state(): DemoState {
    return this.context.state;
  }

  get snapshot(): DemoContext {
    return this.context;
  }

  /** Browser joined the room. Diagnostic only — never treat as readiness. */
  get transportConnected(): boolean {
    return this.context.roomConnected;
  }

  /** The backend session id, surviving teardown so support can quote it. */
  get supportId(): string | null {
    return this.context.lastSessionId;
  }

  // --- DOM ----------------------------------------------------------------

  private build(): void {
    const root = document.createElement('div');
    root.className = 'svd';
    root.setAttribute('dir', directionFor(this.locale));
    root.lang = this.locale;

    const size = this.config.orbSize;
    root.innerHTML = `
      <div class="svd__rule" aria-hidden="true"></div>
      <div class="svd__wave" aria-hidden="true">
        <svg viewBox="0 0 400 80" preserveAspectRatio="none" focusable="false">
          <g class="svd__wave-track">
            <path class="svd__wave-line svd__wave-line--back" d="M0,40.0 L4,42.8 L8,45.5 L12,48.1 L16,50.6 L20,52.9 L24,55.1 L28,57.0 L32,58.6 L36,59.9 L40,60.9 L44,61.6 L48,62.0 L52,62.0 L56,61.6 L60,60.9 L64,59.9 L68,58.6 L72,57.0 L76,55.1 L80,52.9 L84,50.6 L88,48.1 L92,45.5 L96,42.8 L100,40.0 L104,37.2 L108,34.5 L112,31.9 L116,29.4 L120,27.1 L124,24.9 L128,23.0 L132,21.4 L136,20.1 L140,19.1 L144,18.4 L148,18.0 L152,18.0 L156,18.4 L160,19.1 L164,20.1 L168,21.4 L172,23.0 L176,24.9 L180,27.1 L184,29.4 L188,31.9 L192,34.5 L196,37.2 L200,40.0 L204,42.8 L208,45.5 L212,48.1 L216,50.6 L220,52.9 L224,55.1 L228,57.0 L232,58.6 L236,59.9 L240,60.9 L244,61.6 L248,62.0 L252,62.0 L256,61.6 L260,60.9 L264,59.9 L268,58.6 L272,57.0 L276,55.1 L280,52.9 L284,50.6 L288,48.1 L292,45.5 L296,42.8 L300,40.0 L304,37.2 L308,34.5 L312,31.9 L316,29.4 L320,27.1 L324,24.9 L328,23.0 L332,21.4 L336,20.1 L340,19.1 L344,18.4 L348,18.0 L352,18.0 L356,18.4 L360,19.1 L364,20.1 L368,21.4 L372,23.0 L376,24.9 L380,27.1 L384,29.4 L388,31.9 L392,34.5 L396,37.2 L400,40.0 L404,42.8 L408,45.5 L412,48.1 L416,50.6 L420,52.9 L424,55.1 L428,57.0 L432,58.6 L436,59.9 L440,60.9 L444,61.6 L448,62.0 L452,62.0 L456,61.6 L460,60.9 L464,59.9 L468,58.6 L472,57.0 L476,55.1 L480,52.9 L484,50.6 L488,48.1 L492,45.5 L496,42.8 L500,40.0 L504,37.2 L508,34.5 L512,31.9 L516,29.4 L520,27.1 L524,24.9 L528,23.0 L532,21.4 L536,20.1 L540,19.1 L544,18.4 L548,18.0 L552,18.0 L556,18.4 L560,19.1 L564,20.1 L568,21.4 L572,23.0 L576,24.9 L580,27.1 L584,29.4 L588,31.9 L592,34.5 L596,37.2 L600,40.0 L604,42.8 L608,45.5 L612,48.1 L616,50.6 L620,52.9 L624,55.1 L628,57.0 L632,58.6 L636,59.9 L640,60.9 L644,61.6 L648,62.0 L652,62.0 L656,61.6 L660,60.9 L664,59.9 L668,58.6 L672,57.0 L676,55.1 L680,52.9 L684,50.6 L688,48.1 L692,45.5 L696,42.8 L700,40.0 L704,37.2 L708,34.5 L712,31.9 L716,29.4 L720,27.1 L724,24.9 L728,23.0 L732,21.4 L736,20.1 L740,19.1 L744,18.4 L748,18.0 L752,18.0 L756,18.4 L760,19.1 L764,20.1 L768,21.4 L772,23.0 L776,24.9 L780,27.1 L784,29.4 L788,31.9 L792,34.5 L796,37.2 L800,40.0"/>
            <path class="svd__wave-line" d="M0,40.0 L4,42.8 L8,45.5 L12,48.1 L16,50.6 L20,52.9 L24,55.1 L28,57.0 L32,58.6 L36,59.9 L40,60.9 L44,61.6 L48,62.0 L52,62.0 L56,61.6 L60,60.9 L64,59.9 L68,58.6 L72,57.0 L76,55.1 L80,52.9 L84,50.6 L88,48.1 L92,45.5 L96,42.8 L100,40.0 L104,37.2 L108,34.5 L112,31.9 L116,29.4 L120,27.1 L124,24.9 L128,23.0 L132,21.4 L136,20.1 L140,19.1 L144,18.4 L148,18.0 L152,18.0 L156,18.4 L160,19.1 L164,20.1 L168,21.4 L172,23.0 L176,24.9 L180,27.1 L184,29.4 L188,31.9 L192,34.5 L196,37.2 L200,40.0 L204,42.8 L208,45.5 L212,48.1 L216,50.6 L220,52.9 L224,55.1 L228,57.0 L232,58.6 L236,59.9 L240,60.9 L244,61.6 L248,62.0 L252,62.0 L256,61.6 L260,60.9 L264,59.9 L268,58.6 L272,57.0 L276,55.1 L280,52.9 L284,50.6 L288,48.1 L292,45.5 L296,42.8 L300,40.0 L304,37.2 L308,34.5 L312,31.9 L316,29.4 L320,27.1 L324,24.9 L328,23.0 L332,21.4 L336,20.1 L340,19.1 L344,18.4 L348,18.0 L352,18.0 L356,18.4 L360,19.1 L364,20.1 L368,21.4 L372,23.0 L376,24.9 L380,27.1 L384,29.4 L388,31.9 L392,34.5 L396,37.2 L400,40.0 L404,42.8 L408,45.5 L412,48.1 L416,50.6 L420,52.9 L424,55.1 L428,57.0 L432,58.6 L436,59.9 L440,60.9 L444,61.6 L448,62.0 L452,62.0 L456,61.6 L460,60.9 L464,59.9 L468,58.6 L472,57.0 L476,55.1 L480,52.9 L484,50.6 L488,48.1 L492,45.5 L496,42.8 L500,40.0 L504,37.2 L508,34.5 L512,31.9 L516,29.4 L520,27.1 L524,24.9 L528,23.0 L532,21.4 L536,20.1 L540,19.1 L544,18.4 L548,18.0 L552,18.0 L556,18.4 L560,19.1 L564,20.1 L568,21.4 L572,23.0 L576,24.9 L580,27.1 L584,29.4 L588,31.9 L592,34.5 L596,37.2 L600,40.0 L604,42.8 L608,45.5 L612,48.1 L616,50.6 L620,52.9 L624,55.1 L628,57.0 L632,58.6 L636,59.9 L640,60.9 L644,61.6 L648,62.0 L652,62.0 L656,61.6 L660,60.9 L664,59.9 L668,58.6 L672,57.0 L676,55.1 L680,52.9 L684,50.6 L688,48.1 L692,45.5 L696,42.8 L700,40.0 L704,37.2 L708,34.5 L712,31.9 L716,29.4 L720,27.1 L724,24.9 L728,23.0 L732,21.4 L736,20.1 L740,19.1 L744,18.4 L748,18.0 L752,18.0 L756,18.4 L760,19.1 L764,20.1 L768,21.4 L772,23.0 L776,24.9 L780,27.1 L784,29.4 L788,31.9 L792,34.5 L796,37.2 L800,40.0"/>
          </g>
        </svg>
      </div>
      <div class="svd__body">
      <div class="svd__stage">
        <div class="preview-orb" style="width:${size}px;height:${size}px">
          <span class="preview-orb__glow" aria-hidden="true"></span>
          <span class="preview-orb__layer preview-orb__layer--a" aria-hidden="true"></span>
          <span class="preview-orb__layer preview-orb__layer--b" aria-hidden="true"></span>
          <span class="preview-orb__layer preview-orb__layer--c" aria-hidden="true"></span>
          <span class="preview-orb__wisp" aria-hidden="true"></span>
          <span class="preview-orb__rim" aria-hidden="true"></span>
          <span class="svd__core-slot" aria-hidden="true"></span>
          <span class="svd__ripples" aria-hidden="true"></span>
          <span class="svd__level" aria-hidden="true"></span>
          <button type="button" class="preview-orb__call"></button>
        </div>
      </div>
      <div class="svd__copy">
        <p class="svd__headline"></p>
        <p class="svd__sub"></p>
        <p class="svd__hint"></p>
      </div>
      </div>
      <div class="svd__bars" aria-hidden="true"></div>
      <button type="button" class="svd__start">
        <span class="svd__start-icon" aria-hidden="true"></span>
        <span class="svd__start-label"></span>
      </button>
      <p class="svd__meta"></p>
      <div class="svd__consent" role="group" hidden>
        <p class="svd__consent-heading"></p>
        <p class="svd__consent-text"></p>
        <a class="svd__consent-link" target="_blank" rel="noopener noreferrer" hidden></a>
        <div class="svd__consent-actions">
          <button type="button" class="svd__consent-accept"></button>
          <button type="button" class="svd__consent-decline"></button>
        </div>
      </div>
      <div class="svd__support" hidden>
        <span class="svd__support-label"></span>
        <code class="svd__support-id"></code>
        <button type="button" class="svd__support-copy"></button>
      </div>
      <button type="button" class="svd__disconnect" hidden></button>
      <div class="svd__cta" hidden>
        <a class="svd__cta-button" href="#"></a>
      </div>
      <audio class="svd__audio" playsinline></audio>
      <span class="svd__sr-only" role="status" aria-live="polite"></span>
    `;

    const q = <T extends HTMLElement>(selector: string): T => {
      const el = root.querySelector<T>(selector);
      if (!el) throw new Error(`voice-demo: missing ${selector}`);
      return el;
    };

    this.root = root;
    this.orb = q('.preview-orb');
    this.primaryButton = q<HTMLButtonElement>('.preview-orb__call');
    this.disconnectButton = q<HTMLButtonElement>('.svd__disconnect');
    this.headline = q('.svd__headline');
    this.body = q('.svd__sub');
    this.hint = q('.svd__hint');

    this.buildBars();
    this.startButton = q<HTMLButtonElement>('.svd__start');
    this.sessionMeta = q('.svd__meta');
    const startIcon = this.root.querySelector('.svd__start-icon');
    if (startIcon) startIcon.innerHTML = icon(ICONS.mic, 'svd__start-mic');
    this.consentPanel = q('.svd__consent');
    this.consentText = q('.svd__consent-text');
    this.consentLink = q<HTMLAnchorElement>('.svd__consent-link');
    this.consentAccept = q<HTMLButtonElement>('.svd__consent-accept');
    this.consentDecline = q<HTMLButtonElement>('.svd__consent-decline');
    this.supportPanel = q('.svd__support');
    this.supportLabel = q('.svd__support-label');
    this.supportValue = q('.svd__support-id');
    this.supportCopy = q<HTMLButtonElement>('.svd__support-copy');
    this.ctaWrap = q('.svd__cta');
    this.ctaLink = q<HTMLAnchorElement>('.svd__cta-button');
    this.audioElement = q<HTMLAudioElement>('.svd__audio');
    this.liveRegion = q('.svd__sr-only');

    this.audioElement.autoplay = true;
    this.mountCore();

    this.startButton.addEventListener('click', () => {
      // The labelled control. Same single gesture as the orb, so iOS audio
      // unlocking and the no-auto-microphone rule are identical.
      void this.onPrimaryAction();
    });
    this.primaryButton.addEventListener('click', () => {
      // The ONLY path that reaches getUserMedia. Nothing on load, nothing on
      // scroll, nothing on hover.
      void this.onPrimaryAction();
    });
    this.disconnectButton.addEventListener('click', () => {
      void this.disconnect('user_disconnected');
    });
    this.supportCopy.addEventListener('click', () => {
      const id = this.context.lastSessionId;
      if (!id) return;
      // Only the session id ever reaches the clipboard.
      void navigator.clipboard?.writeText?.(id).catch(() => undefined);
      this.supportCopy.textContent = this.strings.supportCopied;
    });
    this.consentAccept.addEventListener('click', () => this.consentDecision?.(true));
    this.consentDecline.addEventListener('click', () => this.consentDecision?.(false));
    this.ctaLink.addEventListener('click', (event) => {
      track('voice_demo_cta_click', { voice_demo_state: this.context.state });

      // Behave like every other "Request a Demo" on the site: open the same
      // modal rather than sending the visitor somewhere else. The href stays
      // a real link so it still works without JS and on pages that do not
      // define the modal (the staging surface, for one).
      const openDemoModal = (window as { openDemoModal?: () => void }).openDemoModal;
      if (typeof openDemoModal === 'function') {
        event.preventDefault();
        openDemoModal();
      }
    });

    this.mount.appendChild(root);
  }

  /**
   * Swaps the placeholder for the looping video core.
   *
   * Muted, playsInline and decorative: it carries no audio track at all, so
   * there is nothing that could autoplay. Under prefers-reduced-motion it is
   * left paused on its first frame rather than removed, so the orb keeps its
   * depth without moving.
   */
  private mountCore(): void {
    const slot = this.root.querySelector('.svd__core-slot');
    if (!slot || !this.config.coreSrc) return;

    const video = document.createElement('video');
    video.className = 'preview-orb__core';
    video.src = this.config.coreSrc;
    video.loop = true;
    video.muted = true;
    video.defaultMuted = true;
    video.autoplay = true;
    video.tabIndex = -1;
    video.setAttribute('playsinline', '');
    video.setAttribute('aria-hidden', 'true');
    video.setAttribute('disableremoteplayback', '');
    video.preload = 'auto';
    slot.replaceWith(video);
    this.coreVideo = video;

    if (this.prefersReducedMotion()) {
      video.pause();
      return;
    }
    const played = video.play();
    if (played && typeof played.catch === 'function') played.catch(() => undefined);
  }

  /**
   * The equaliser. Bars are built once with a fixed pseudo-random rhythm so
   * the row reads as a voice signature rather than a uniform comb, and each
   * carries its own phase offset so they ripple instead of pulsing in unison.
   */
  private buildBars(): void {
    const host = this.root.querySelector('.svd__bars');
    if (!host) return;

    // Deterministic: the same shape every render, no Math.random at runtime.
    const SEED = [
      0.42, 0.78, 0.35, 0.9, 0.55, 0.28, 0.68, 1, 0.48, 0.82, 0.36, 0.72, 0.95, 0.5,
      0.3, 0.86, 0.44, 0.66, 0.98, 0.4, 0.74, 0.52, 0.88, 0.33, 0.7, 0.46, 0.92, 0.6,
      0.38, 0.8, 0.5, 0.26,
    ];
    for (let i = 0; i < SEED.length; i += 1) {
      const bar = document.createElement('span');
      bar.className = 'svd__bar';
      bar.style.setProperty('--h', String(SEED[i]));
      bar.style.setProperty('--d', `${(i % 7) * -0.13}s`);
      host.appendChild(bar);
    }
  }

  private prefersReducedMotion(): boolean {
    return (
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  private dispatch(event: DemoEvent): boolean {
    const next = reduce(this.context, event);
    if (next === this.context) return false; // rejected transition
    this.context = next;
    this.render();
    return true;
  }

  private render(): void {
    if (this.destroyed) return;
    const { state, pendingConsent } = this.context;
    const s = this.strings;

    this.root.setAttribute('data-state', state);
    this.root.setAttribute('dir', directionFor(this.locale));
    this.root.lang = this.locale;
    this.root.classList.toggle('svd--consent', pendingConsent !== null);

    if (this.coreVideo && !this.prefersReducedMotion()) {
      this.coreVideo.playbackRate =
        state === 'assistantSpeaking' ? 1.35 : state === 'assistantThinking' ? 1.15 : 0.75;
    }

    this.orb.className = `preview-orb preview-orb--${ORB_MODIFIER[state]}` +
      (state === 'assistantSpeaking' ? ' preview-orb--reactive' : '');

    const ripples = this.root.querySelector('.svd__ripples');
    if (ripples) {
      ripples.innerHTML =
        state === 'assistantSpeaking'
          ? '<span class="preview-orb__ripple"></span>' +
            '<span class="preview-orb__ripple preview-orb__ripple--2"></span>' +
            '<span class="preview-orb__ripple preview-orb__ripple--3"></span>'
          : '';
    }

    const copy = this.copyFor();
    this.headline.textContent = copy.title;
    this.body.textContent = copy.body;
    this.hint.textContent = copy.hint ?? '';
    this.hint.hidden = !copy.hint;

    const offerStart = state === 'ready' || state === 'finished' || state === 'error' ||
      state === 'rateLimited';
    const startLabel = this.startButton.querySelector('.svd__start-label');
    if (startLabel) startLabel.textContent = state === 'ready' ? s.startButton : s.retry;
    this.startButton.hidden = !offerStart;

    this.sessionMeta.textContent = s.sessionMeta;
    this.sessionMeta.hidden = state !== 'ready';

    // Primary button
    const busy = state === 'requestingMicrophone' || state === 'connecting' || state === 'reconnecting';
    this.primaryButton.disabled = busy || state === 'unavailable' || pendingConsent !== null;
    this.primaryButton.innerHTML =
      state === 'listening' || state === 'assistantSpeaking'
        ? icon(ICONS.hangUp)
        : busy
          ? icon(ICONS.spinner, 'svd-spin')
          : state === 'unavailable'
            ? icon(ICONS.blocked)
            : state === 'ready'
              ? icon(ICONS.mic)
              : icon(ICONS.retry);

    const label =
      state === 'listening' || state === 'assistantSpeaking'
        ? s.disconnect
        : state === 'ready'
          ? s.startLabel
          : s.retry;
    this.primaryButton.setAttribute('aria-label', label);
    this.primaryButton.setAttribute('title', label);

    // Explicit disconnect control, separate from the orb, whenever a session
    // is live enough to leak.
    const canDisconnect = isActive(state);
    this.disconnectButton.hidden = !canDisconnect;
    this.disconnectButton.textContent = s.disconnect;

    // Consent — wording is always the server's.
    this.consentPanel.hidden = pendingConsent === null;
    if (pendingConsent) {
      const heading = this.root.querySelector('.svd__consent-heading');
      if (heading) heading.textContent = s.consentHeading;
      this.consentText.textContent = pendingConsent.text;
      this.consentAccept.textContent = s.consentAccept;
      this.consentDecline.textContent = s.consentDecline;
      if (pendingConsent.policyUrl) {
        this.consentLink.href = pendingConsent.policyUrl;
        this.consentLink.textContent = s.consentPolicyLink;
        this.consentLink.hidden = false;
      } else {
        this.consentLink.hidden = true;
      }
    }

    // Support ID — shown when a readiness failure leaves something to quote.
    const agentFailure =
      this.config.showSupportId &&
      state === 'error' &&
      (this.context.errorCode === 'agent_unavailable' || this.context.errorCode === 'agent_lost');
    const supportId = this.context.lastSessionId;
    this.supportPanel.hidden = !(agentFailure && supportId);
    if (agentFailure && supportId) {
      this.supportLabel.textContent = s.supportIdLabel;
      this.supportValue.textContent = supportId;
      this.supportCopy.textContent = s.supportCopy;
    }

    // Conversion moment
    const showCta = state === 'finished' || state === 'rateLimited';
    this.ctaWrap.hidden = !showCta;
    this.ctaLink.textContent = s.signupCta;
    this.ctaLink.href = `${this.config.signupUrl}?utm_source=website&utm_medium=voice_demo&utm_campaign=hero_orb`;

    this.liveRegion.textContent = `${copy.title}. ${copy.body}`;
  }

  private copyFor(): { title: string; body: string; hint?: string } {
    const s = this.strings;
    const { state, errorCode, rateLimitScope } = this.context;

    switch (state) {
      case 'unavailable':
        return { title: s.unavailableTitle, body: s.unavailableBody };
      case 'ready':
        return { title: s.readyTitle, body: s.readyBody };
      case 'requestingMicrophone':
        return { title: s.micTitle, body: s.micBody };
      case 'connecting':
        return { title: s.connectingTitle, body: s.connectingBody };
      case 'listening':
        return { title: s.listeningTitle, body: `${s.listeningBody} ${this.remainingLabel()}` };
      case 'assistantThinking':
        return { title: s.thinkingTitle, body: `${s.thinkingBody} ${this.remainingLabel()}` };
      case 'assistantSpeaking':
        return { title: s.speakingTitle, body: `${s.speakingBody} ${this.remainingLabel()}` };
      case 'reconnecting':
        return { title: s.reconnectingTitle, body: s.reconnectingBody };
      case 'finished':
        return { title: s.finishedTitle, body: s.finishedBody };
      case 'rateLimited':
        return rateLimitScope === 'global_capacity'
          ? { title: s.rateLimitedCapacityTitle, body: s.rateLimitedCapacityBody }
          : { title: s.rateLimitedVisitorTitle, body: s.rateLimitedVisitorBody };
      case 'error': {
        const key = `err_${errorCode ?? 'server_error'}` as keyof Strings;
        const body = (s[key] as string | undefined) ?? s.err_server_error;
        const hint =
          errorCode === 'microphone_denied' ? s.err_microphone_denied_hint : undefined;
        return hint ? { title: s.errorTitle, body, hint } : { title: s.errorTitle, body };
      }
    }
  }

  private remainingLabel(): string {
    if (!this.deadline) return '';
    return `${mmss((this.deadline - this.now()) / 1000)} ${this.strings.timeRemaining}.`;
  }

  // --- Flow ---------------------------------------------------------------

  private async onPrimaryAction(): Promise<void> {
    if (isActive(this.context.state)) {
      await this.disconnect('user_disconnected');
      return;
    }
    await this.start();
  }

  /**
   * Begins a session. Safe to call twice: the machine rejects a second START
   * while a connection is in flight, and this returns without touching the
   * microphone or the network.
   */
  async start(): Promise<void> {
    if (this.destroyed) return;

    const reason = unavailableReason(this.config);
    if (reason) {
      this.dispatch({ type: 'DEMO_UNAVAILABLE', reason });
      return;
    }

    // Rejected when a session is already in flight, or while a server's
    // Retry-After window is still open.
    if (!this.dispatch({ type: 'START', at: this.now() })) return;

    this.lastTransportPhase = null; // stale phase must not follow a new attempt
    const attempt = this.context.attempt;
    /**
     * True once this attempt's work no longer belongs to the widget's current
     * state. The `isActive` term is what makes cancellation work: `pagehide`
     * or the disconnect button moves the machine to `finished` without
     * bumping `attempt`, and every await below has to notice that.
     */
    const stale = (): boolean =>
      this.destroyed || this.context.attempt !== attempt || !isActive(this.context.state);

    track('voice_demo_start', { voice_demo_locale: this.locale });

    // Unlock audio inside the click gesture; iOS Safari grants playback only to
    // a chain rooted here.
    this.primeAudio();

    // Fired now, awaited just before the POST: it runs alongside the
    // microphone prompt and the Turnstile challenge, so it adds no latency of
    // its own to the twenty seconds a visitor will tolerate.
    const initialLanguage = this.resolveInitialLanguage();

    // 1. Microphone — never before this point.
    let microphone: MediaStream;
    try {
      microphone = await this.requestMicrophone();
    } catch (cause) {
      if (stale()) return;
      this.handleMicrophoneError(cause);
      return;
    }
    if (stale()) {
      microphone.getTracks().forEach((t) => t.stop());
      return;
    }
    this.microphone = microphone;
    this.dispatch({ type: 'MIC_GRANTED' });
    track('voice_demo_mic_granted');

    // 2. Session, possibly via a consent round-trip.
    this.abortController = new AbortController();
    let session;
    try {
      session = await this.obtainSession(attempt, await initialLanguage);
    } catch (cause) {
      if (stale()) return;
      this.handleRequestError(cause);
      return;
    }
    if (stale() || !session) return;

    this.dispatch({ type: 'SESSION_GRANTED', session });

    if (Date.parse(session.expiresAt) <= this.now()) {
      this.fail('session_expired_before_start');
      return;
    }

    // 3. Real-time leg.
    try {
      const transport = this.makeTransport(this.transportEvents(attempt));
      this.transport = transport;
      await transport.connect({
        url: session.livekitUrl,
        token: session.token,
        microphone,
        audioElement: this.audioElement,
      });
    } catch (cause) {
      if (stale()) return;
      // Phase and error *name* only — no token, URL, response body or device.
      this.lastTransportPhase = cause instanceof TransportError ? cause.phase : 'unknown';
      logger.error('transport failed', {
        phase: this.lastTransportPhase,
        cause: cause instanceof TransportError ? cause.causeName : (cause as Error)?.name,
      });
      this.fail('transport_failed');
      return;
    }

    // The visitor may have cancelled or navigated while the room was joining.
    // The connection succeeded regardless, so it has to be closed explicitly —
    // otherwise it is a room nobody is in, still burning agent minutes.
    if (stale()) {
      this.releaseMicrophone();
      await this.teardownTransport();
      return;
    }

    this.beginCountdown(session.expiresAt);
    // NOTE: no state change here. Our own connection is not readiness — the
    // transport's onConnected records it, and only the remote agent's
    // lk.agent.state can move the UI to "listening".
    track('voice_demo_room_connected', { voice_demo_session: session.sessionId });
  }

  /**
   * Requests a session, satisfying a consent demand if one comes back. At most
   * two round-trips: ask, accept, ask again.
   */
  /**
   * Asks the same-origin function which language to open in.
   *
   * Returns null on ANY failure — non-200, malformed body, unknown country,
   * timeout, network error. Null means the language property is omitted
   * entirely, which is the pre-existing automatic behaviour, so this lookup
   * can only ever improve on it and never break a call.
   */
  private async resolveInitialLanguage(): Promise<DemoLanguage | null> {
    // An explicit override, if one is ever wired up, wins over geography.
    if (this.config.languageOverride) return this.config.languageOverride;

    const url = this.config.languageLookupUrl;
    if (!url) return null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.languageLookupTimeoutMs);

    try {
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'omit',
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!response.ok) return null;

      const payload: unknown = await response.json();
      const value = (payload as { language?: unknown } | null)?.language;
      if (value !== 'he' && value !== 'en' && value !== 'ar') return null;
      return value;
    } catch {
      // Deliberately silent: a failed lookup is not a visitor-facing problem,
      // and the cause could quote a URL we would rather not log.
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  private async obtainSession(
    attempt: number,
    initialLanguage: DemoLanguage | null,
  ): Promise<import('./contract').DemoSession | null> {
    for (let round = 0; round < 2; round += 1) {
      // A fresh, single-use token immediately before *every* POST, including
      // the retry after a consent round-trip. Tokens are single-use, so the
      // second request cannot reuse the first one's.
      const turnstileToken = await this.freshTurnstileToken();
      if (this.destroyed || this.context.attempt !== attempt) return null;

      let result;
      try {
        result = await this.client.createSession({
          // Automatic: `this.locale` drives RENDERING only and is never sent.
          // What may be sent is the country-resolved starting language, or
          // nothing at all when it could not be resolved.
          languageOverride: initialLanguage ?? undefined,
          consent: this.context.acceptedConsent ?? undefined,
          turnstileToken,
          signal: this.abortController?.signal,
        });
      } finally {
        // Discard on every outcome, success or failure. A token left sitting
        // in the widget is one that could be replayed on the next attempt.
        this.turnstile?.reset();
      }

      if (this.destroyed || this.context.attempt !== attempt) return null;

      if (result.kind === 'session') {
        const recording = result.session.recording;
        // A session that records but has not been agreed to still needs a yes.
        if (recording?.required && !this.hasAccepted(recording)) {
          const accepted = await this.askForConsent(recording, attempt);
          if (!accepted) return null;
          continue;
        }
        return result.session;
      }

      const accepted = await this.askForConsent(result.consent, attempt);
      if (!accepted) return null;
    }

    this.fail('consent_required');
    return null;
  }

  /**
   * Obtains a Turnstile token, or throws.
   *
   * Returns undefined only when no site key is configured at all — and in that
   * case `unavailableReason` has already refused to start, so an enabled demo
   * can never reach the endpoint unprotected.
   */
  private async freshTurnstileToken(): Promise<string | undefined> {
    const siteKey = this.config.turnstileSiteKey;
    if (!siteKey) return undefined;

    if (!this.turnstile) {
      this.turnstile =
        this.deps.createTurnstile?.(this.config) ?? createTurnstileProvider({ siteKey });
    }

    try {
      return await this.turnstile.getToken();
    } catch (cause) {
      logger.warn('turnstile challenge failed', cause);
      throw new DemoRequestError('verification_failed', 'could not obtain a Turnstile token');
    }
  }

  /**
   * Consent is matched on version AND locale: the same policy rendered in a
   * different language is a different thing to have agreed to.
   */
  private hasAccepted(consent: RecordingConsent): boolean {
    const accepted = this.context.acceptedConsent;
    if (!accepted) return false;
    return accepted.policyVersion === consent.policyVersion && accepted.locale === consent.locale;
  }

  /** Renders the server's wording and waits for a decision. */
  private async askForConsent(consent: RecordingConsent, attempt: number): Promise<boolean> {
    if (!this.dispatch({ type: 'CONSENT_REQUIRED', consent })) return false;

    const accepted = await new Promise<boolean>((resolve) => {
      this.consentDecision = resolve;
    });
    this.consentDecision = null;

    if (this.destroyed || this.context.attempt !== attempt) return false;

    if (!accepted) {
      track('voice_demo_consent_declined', { voice_demo_policy: consent.policyVersion });
      this.dispatch({ type: 'CONSENT_DECLINED' });
      this.releaseMicrophone();
      return false;
    }

    this.dispatch({
      type: 'CONSENT_ACCEPTED',
      acceptedAt: new Date(this.now()).toISOString(),
    });
    track('voice_demo_consent_accepted', { voice_demo_policy: consent.policyVersion });
    return true;
  }

  private transportEvents(attempt: number): TransportEvents {
    const guard = (fn: () => void) => (): void => {
      if (this.destroyed || this.context.attempt !== attempt) return;
      fn();
    };

    return {
      onConnected: guard(() => {
        // Room joined and microphone published. Deliberately NOT readiness:
        // this only records that our half succeeded.
        this.dispatch({ type: 'ROOM_CONNECTED' });
        this.startAgentReadinessTimeout(attempt);
      }),
      onDisconnected: guard(() => {
        if (isActive(this.context.state)) void this.disconnect('remote_disconnected');
      }),
      onReconnecting: guard(() => {
        this.dispatch({ type: 'RECONNECTING' });
        // A reconnect that never resolves must not hang in `reconnecting`.
        this.after(this.config.reconnectTimeoutSeconds * 1000, () => {
          if (this.context.state === 'reconnecting') this.fail('reconnect_failed');
        });
      }),
      onReconnected: guard(() => this.dispatch({ type: 'RECONNECTED' })),
      onAgentState: (raw: string | null) => guard(() => this.applyAgentState(raw))(),
      onLevel: (level: number) => {
        if (this.destroyed) return;
        const value = level.toFixed(3);
        this.orb.style.setProperty('--orb-level', value);
        // The waveform breathes with her voice — the amplitude is the real
        // remote audio level, not a canned animation.
        this.root.style.setProperty('--wave-level', value);
      },
      onError: guard(() => this.fail('transport_failed')),
    };
  }

  /**
   * Translates the remote agent's `lk.agent.state` into UI state.
   *
   * The whole point: nothing here reads our own microphone or connection. An
   * unrecognised or absent value is `pending`, never ready — so a future SDK
   * value cannot make the page claim the secretary is listening.
   */
  private applyAgentState(raw: string | null): void {
    const readiness = readinessFor(raw);

    switch (readiness) {
      case 'ready':
        this.clearAgentReadinessTimeout();
        this.dispatch({ type: 'AGENT_READY' });
        return;
      case 'thinking':
        this.clearAgentReadinessTimeout();
        this.dispatch({ type: 'AGENT_THINKING' });
        return;
      case 'speaking':
        this.clearAgentReadinessTimeout();
        this.dispatch({ type: 'AGENT_SPEAKING' });
        return;
      case 'lost':
        // Reported failure, or the agent left after having been ready.
        this.failAgent(this.context.roomConnected && agentIsReady(this.context.state)
          ? 'agent_lost'
          : 'agent_unavailable');
        return;
      case 'pending':
        if (raw === null && agentIsReady(this.context.state)) {
          // It was ready and is now gone from the room entirely.
          this.failAgent('agent_lost');
          return;
        }
        this.dispatch({ type: 'AGENT_PENDING' });
        return;
    }
  }

  /**
   * The agent has this long to appear and report readiness. Without it a
   * visitor sits on "connecting" forever when only the browser joins — which
   * is precisely what happened on the failed staging call.
   */
  private startAgentReadinessTimeout(attempt: number): void {
    this.clearAgentReadinessTimeout();
    const ms = this.config.agentReadinessTimeoutSeconds * 1000;
    this.agentTimeout = setTimeout(() => {
      if (this.destroyed || this.context.attempt !== attempt) return;
      if (agentIsReady(this.context.state)) return;
      this.failAgent('agent_unavailable');
    }, ms);
  }

  private clearAgentReadinessTimeout(): void {
    if (this.agentTimeout !== null) {
      clearTimeout(this.agentTimeout);
      this.agentTimeout = null;
    }
  }

  /** Terminal agent failure: error plus a full teardown of everything held. */
  private failAgent(code: 'agent_unavailable' | 'agent_lost'): void {
    if (!isActive(this.context.state)) return;
    this.lastTransportPhase = 'agent_readiness';
    logger.error('agent readiness failed', {
      phase: 'agent_readiness',
      code,
      session: this.context.lastSessionId,
    });
    this.fail(code);
  }

  private async requestMicrophone(): Promise<MediaStream> {
    if (this.deps.requestMicrophone) return this.deps.requestMicrophone();
    return navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
  }

  private handleMicrophoneError(cause: unknown): void {
    const name = (cause as { name?: string })?.name;
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
      track('voice_demo_mic_denied');
      this.dispatch({ type: 'MIC_DENIED' });
      return;
    }
    this.dispatch({ type: 'MIC_UNAVAILABLE' });
  }

  private handleRequestError(cause: unknown): void {
    if ((cause as { name?: string })?.name === 'AbortError') return;

    if (cause instanceof DemoRequestError) {
      if (cause.code === 'rate_limited' || cause.code === 'demo_capacity_reached') {
        this.releaseMicrophone();
        this.dispatch({
          type: 'RATE_LIMITED',
          scope: rateLimitScopeFor(cause.code),
          retryAfterSeconds: cause.retryAfterSeconds,
          at: this.now(),
        });
        track('voice_demo_rate_limited', { voice_demo_code: cause.code });
        return;
      }
      if (cause.code === 'demo_disabled' || cause.code === 'demo_unavailable') {
        this.releaseMicrophone();
        this.dispatch({ type: 'DEMO_UNAVAILABLE', reason: cause.code });
        return;
      }
      this.fail(cause.code);
      return;
    }

    logger.error('session request failed', cause);
    this.fail('server_error');
  }

  private fail(code: AnyErrorCode): void {
    const sessionId = this.context.lastSessionId;
    this.releaseMicrophone();
    void this.teardownTransport();
    this.clearTimers();
    this.dispatch({ type: 'ERROR', code });
    track('voice_demo_error', {
      voice_demo_code: code,
      ...(this.lastTransportPhase ? { voice_demo_phase: this.lastTransportPhase } : {}),
      // The backend session id is the one identifier support can act on. It is
      // not a credential and carries nothing about the token or the room.
      ...(sessionId ? { voice_demo_session: sessionId } : {}),
    });
  }

  /** Exposed for QA and tests; not rendered anywhere. */
  get transportPhase(): TransportPhase | 'agent_readiness' | 'unknown' | null {
    return this.lastTransportPhase;
  }

  /**
   * Ends the session and releases every resource it held.
   *
   * Reachable from four places: the disconnect button, the session deadline,
   * a transport-side drop, and `pagehide`. Because `requestingMicrophone` and
   * `connecting` are active states, it also serves as cancellation — aborting
   * the in-flight request and stopping a microphone that may still be
   * resolving.
   */
  async disconnect(reason: FinishReason): Promise<void> {
    if (!isActive(this.context.state)) return;
    this.clearTimers();
    this.abortController?.abort();
    this.abortController = null;
    // Drop any challenge in flight; its token would be stale by the retry.
    this.turnstile?.reset();
    this.consentDecision?.(false);
    this.releaseMicrophone();
    await this.teardownTransport();
    this.dispatch({ type: 'DISCONNECT', reason });
    track('voice_demo_finished', { voice_demo_reason: reason });
  }

  private beginCountdown(expiresAt: string): void {
    const expiry = Date.parse(expiresAt);
    const cap = this.now() + this.config.maxSessionSeconds * 1000;
    // Whichever runs out first.
    this.deadline = Number.isFinite(expiry) ? Math.min(expiry, cap) : cap;

    this.tickTimer = setInterval(() => {
      if (!isActive(this.context.state)) return;
      this.render();
    }, 1000);

    this.after(Math.max(0, this.deadline - this.now()), () => {
      void this.disconnect('session_expired');
    });
  }

  private primeAudio(): void {
    try {
      this.audioElement.muted = false;
      // jsdom returns undefined here rather than a promise, so this cannot
      // assume a thenable.
      const played: unknown = this.audioElement.play?.();
      if (played && typeof (played as Promise<void>).catch === 'function') {
        void (played as Promise<void>).catch(() => undefined);
      }
    } catch {
      // An empty element that will not play is still unlocked by the attempt.
    }
  }

  private releaseMicrophone(): void {
    this.microphone?.getTracks().forEach((t) => t.stop());
    this.microphone = null;
  }

  private async teardownTransport(): Promise<void> {
    const transport = this.transport;
    this.transport = null;
    await transport?.disconnect();
  }

  private after(ms: number, fn: () => void): void {
    this.timers.push(setTimeout(fn, ms));
  }

  private clearTimers(): void {
    this.clearAgentReadinessTimeout();
    this.timers.forEach(clearTimeout);
    this.timers = [];
    if (this.tickTimer !== null) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    this.deadline = 0;
  }

  // --- Lifecycle ----------------------------------------------------------

  private watchLifecycle(): void {
    window.addEventListener('pagehide', this.onPageHide);

    // "Cleanup on navigation/modal close": if whatever contained the widget is
    // torn out of the DOM, the session goes with it.
    if (typeof MutationObserver === 'function' && this.mount.parentNode) {
      this.mountObserver = new MutationObserver(() => {
        if (!this.mount.isConnected) this.destroy();
      });
      this.mountObserver.observe(document.body, { childList: true, subtree: true });
    }
  }

  /** Idempotent. Releases the microphone, the room, timers and listeners. */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    this.clearTimers();
    this.abortController?.abort();
    this.abortController = null;
    this.consentDecision?.(false);
    this.consentDecision = null;
    this.releaseMicrophone();
    void this.teardownTransport();
    this.turnstile?.destroy();
    this.turnstile = null;

    window.removeEventListener('pagehide', this.onPageHide);
    this.mountObserver?.disconnect();
    this.mountObserver = null;

    this.root.remove();
  }

  /** Re-renders in a new locale; used when the page's language toggle fires. */
  setLocale(locale: DemoLocale): void {
    if (locale === this.locale) return;
    this.locale = locale;
    this.strings = stringsFor(locale);
    this.render();
  }
}
