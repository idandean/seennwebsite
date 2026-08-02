/**
 * PUBLIC_DEMO_MODE and the rest of the widget's configuration.
 *
 * ---------------------------------------------------------------------------
 * ENABLING IS ASYMMETRIC — READ THIS BEFORE CHANGING IT
 * ---------------------------------------------------------------------------
 * Exactly one source can turn the demo ON:
 *
 *     window.SEENN_VOICE_DEMO.publicDemoMode === 'enabled'
 *
 * Every other source is a KILL SWITCH: it can force the demo off, and can
 * never turn it on. That includes `?voicedemo=`, which used to be able to
 * enable the widget — a URL anyone could construct, on a page they did not
 * control, is not an acceptable way to switch on a feature that asks for a
 * microphone.
 *
 * There is deliberately no build-time define. This repository is a static
 * site: it has no root `package.json`, no build step, and therefore **Vercel
 * environment variables never reach it**. A define would have implied
 * otherwise. See tools/voice-demo/CONFIGURATION.md.
 *
 * Committed defaults are disabled and empty, and must stay that way.
 */

import { looksLikeServerSecret } from './contract';
import { logger } from './logging';
import type { DemoLocale } from './contract';

export type PublicDemoMode = 'enabled' | 'disabled';

export interface VoiceDemoConfig {
  /** Only `window.SEENN_VOICE_DEMO` can set this to 'enabled'. */
  publicDemoMode: PublicDemoMode;

  /** Supabase project hosting the endpoint. Staging and production differ. */
  endpointBaseUrl: string;
  /** Supabase ANON / publishable key. A secret key here is refused, loudly. */
  anonKey: string;
  endpointPath: string;

  /**
   * Cloudflare Turnstile site key. Required whenever the demo is enabled: a
   * public, anonymous endpoint that spends AI minutes needs bot protection,
   * so a missing key fails closed rather than posting unprotected.
   */
  turnstileSiteKey: string;

  /** Widget RENDERING locale. null → follow the page. Never sent to the API. */
  locale: DemoLocale | null;

  /**
   * Explicit conversation-language override for the API request. null means
   * automatic, which is the only behaviour exposed today: the request omits
   * `language` entirely and the backend picks the initial greeting.
   *
   * Kept as a hook for a future subtle globe/settings control labelled
   * "Automatic" — deliberately not a prominent dropdown, and not rendered at
   * all in this revision.
   */
  languageOverride: DemoLocale | null;

  /** Pinned to an exact immutable version — see the constant below. */
  livekitModuleUrl: string;

  maxSessionSeconds: number;
  reconnectTimeoutSeconds: number;
  /**
   * How long the remote agent has to appear and report readiness after the
   * browser joins the room. Without this a visitor waits forever when only the
   * browser ever joins.
   */
  agentReadinessTimeoutSeconds: number;

  signupUrl: string;
  orbSize: number;

  /** When blocked, render nothing rather than an "unavailable" panel. */
  renderWhenUnavailable: boolean;
}

/**
 * Exact version, not a `@2` range.
 *
 * A floating major tag means the code a visitor executes can change without
 * any commit here — a supply-chain surface on a page that holds a microphone
 * permission and a session token. Bump this deliberately.
 */
export const LIVEKIT_CLIENT_VERSION = '2.21.0';
export const LIVEKIT_MODULE_URL = `https://cdn.jsdelivr.net/npm/livekit-client@${LIVEKIT_CLIENT_VERSION}/+esm`;

export const DEFAULT_CONFIG: VoiceDemoConfig = {
  publicDemoMode: 'disabled',
  endpointBaseUrl: '',
  anonKey: '',
  endpointPath: '/functions/v1/public-voice-demo',
  turnstileSiteKey: '',
  locale: null,
  languageOverride: null,
  livekitModuleUrl: LIVEKIT_MODULE_URL,
  maxSessionSeconds: 120,
  reconnectTimeoutSeconds: 20,
  agentReadinessTimeoutSeconds: 20,
  signupUrl: 'https://app.seenn.ai/auth/signup',
  orbSize: 200,
  renderWhenUnavailable: false,
};

function metaContent(name: string): string | undefined {
  return document.querySelector(`meta[name="${name}"]`)?.getAttribute('content') ?? undefined;
}

function urlParameter(): string | undefined {
  try {
    return new URLSearchParams(window.location.search).get('voicedemo') ?? undefined;
  } catch {
    return undefined;
  }
}

/** Recognises an explicit "off". Anything else is not a kill signal. */
function isKillSignal(raw: string | undefined): boolean {
  if (raw === undefined) return false;
  const value = raw.trim().toLowerCase();
  return value === 'disabled' || value === 'off' || value === 'false' || value === '0';
}

/**
 * Recognises an explicit "on". Only consulted for the inline config.
 *
 * Exact match, no trimming and no case folding: the declared type is the
 * literal `'enabled'`, and anything else — `'ENABLED'`, `' enabled'`, `'on'`,
 * `true` — is a configuration mistake. A flag that gates a microphone prompt
 * should fail closed on a typo, not guess what was meant.
 */
function isEnableSignal(raw: string | undefined): boolean {
  return raw === 'enabled';
}

export interface ConfigSources {
  /** Defaults to `window.SEENN_VOICE_DEMO`. */
  inline?: Partial<VoiceDemoConfig> | undefined;
  dataset?: DOMStringMap | undefined;
}

/**
 * Resolves the effective config. Never throws: a misconfigured widget must
 * degrade to `unavailable`, not break the page it is embedded in.
 */
export function resolveConfig(sources: ConfigSources = {}): VoiceDemoConfig {
  const inline =
    sources.inline ??
    (window as { SEENN_VOICE_DEMO?: Partial<VoiceDemoConfig> }).SEENN_VOICE_DEMO;

  const config: VoiceDemoConfig = { ...DEFAULT_CONFIG, ...(inline ?? {}) };

  // The one and only way in.
  let mode: PublicDemoMode = isEnableSignal(inline?.publicDemoMode) ? 'enabled' : 'disabled';

  // Kill switches. Either can veto; neither can grant.
  if (isKillSignal(urlParameter())) mode = 'disabled';
  if (isKillSignal(metaContent('seenn:public-demo-mode'))) mode = 'disabled';

  config.publicDemoMode = mode;

  const dataset = sources.dataset;
  if (dataset) {
    if (dataset['orbSize']) config.orbSize = Number(dataset['orbSize']) || config.orbSize;
    if (dataset['locale']) config.locale = dataset['locale'] as DemoLocale;
  }

  // A service-role or secret key in the browser is the failure this widget
  // must never have. Refuse the credential and switch the demo off rather than
  // putting it in a network request.
  if (config.anonKey && looksLikeServerSecret(config.anonKey)) {
    logger.error(
      'refusing to start: the configured key looks like a server-side secret ' +
        '(service_role / sb_secret_ / API secret). Use the Supabase anon or publishable key.',
    );
    config.anonKey = '';
    config.publicDemoMode = 'disabled';
  }

  return config;
}

export type UnavailableReason =
  | 'flag_disabled'
  | 'endpoint_not_configured'
  | 'turnstile_not_configured'
  | 'browser_unsupported';

/**
 * The demo runs only when the flag is on AND it has somewhere to call AND it
 * can prove the caller is not a bot. Returns the reason it cannot, or null.
 */
export function unavailableReason(config: VoiceDemoConfig): UnavailableReason | null {
  if (config.publicDemoMode !== 'enabled') return 'flag_disabled';
  if (!config.endpointBaseUrl || !config.anonKey) return 'endpoint_not_configured';
  if (!config.turnstileSiteKey) return 'turnstile_not_configured';
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return 'browser_unsupported';
  }
  return null;
}
