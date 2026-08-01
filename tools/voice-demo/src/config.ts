/**
 * PUBLIC_DEMO_MODE and the rest of the widget's configuration.
 *
 * This repository is a static site with no build step at the root and no
 * environment-variable system of its own — pages are hand-written HTML served
 * by Vercel. So "environment variable" here means one of four sources, checked
 * in this order:
 *
 *   1. `?voicedemo=` URL parameter          — QA only, never sticky
 *   2. `window.SEENN_VOICE_DEMO`            — per-page inline config
 *   3. `<meta name="seenn:public-demo-mode">` — per-environment, set in HTML
 *   4. `__PUBLIC_DEMO_MODE__`               — build-time define (see scripts/build.mjs)
 *
 * The build-time define is what a staging deploy would set, via
 * `PUBLIC_DEMO_MODE=enabled npm run build` in tools/voice-demo. It defaults to
 * `disabled`, so a build with no environment configured produces a widget that
 * renders nothing.
 */

import { looksLikeServerSecret } from './contract';
import { logger } from './logging';
import type { DemoLocale } from './contract';

/** Injected by esbuild at build time; see scripts/build.mjs. */
declare const __PUBLIC_DEMO_MODE__: string;

export type PublicDemoMode = 'enabled' | 'disabled';

export interface VoiceDemoConfig {
  /** Master feature flag. Anything other than the literal 'enabled' is off. */
  publicDemoMode: PublicDemoMode;

  /** Base URL of the Supabase project hosting the endpoint (staging ≠ prod). */
  endpointBaseUrl: string;
  /** Supabase ANON key. A service-role key here is refused, loudly. */
  anonKey: string;
  /** Path appended to `endpointBaseUrl`. */
  endpointPath: string;

  /** null → follow the page's locale. */
  locale: DemoLocale | null;

  /** Cloudflare Turnstile site key; omitted from the request when empty. */
  turnstileSiteKey: string;

  /** Fetched only on activation — livekit-client is not small. */
  livekitModuleUrl: string;

  /** Hard client-side ceiling regardless of what the token's expiry says. */
  maxSessionSeconds: number;
  /** How long a LiveKit reconnect may run before we call it an error. */
  reconnectTimeoutSeconds: number;

  /** Conversion target shown in the finished state. */
  signupUrl: string;

  /** Orb diameter in px. */
  orbSize: number;

  /**
   * When the flag is off, render nothing at all rather than an "unavailable"
   * panel. A marketing page should not advertise a demo it cannot give.
   */
  renderWhenUnavailable: boolean;
}

export const DEFAULT_CONFIG: VoiceDemoConfig = {
  publicDemoMode: 'disabled',
  endpointBaseUrl: '',
  anonKey: '',
  endpointPath: '/functions/v1/public-voice-demo',
  locale: null,
  turnstileSiteKey: '',
  livekitModuleUrl: 'https://cdn.jsdelivr.net/npm/livekit-client@2/+esm',
  maxSessionSeconds: 120,
  reconnectTimeoutSeconds: 20,
  signupUrl: 'https://app.seenn.ai/auth/signup',
  orbSize: 200,
  renderWhenUnavailable: false,
};

function buildTimeMode(): string {
  try {
    return typeof __PUBLIC_DEMO_MODE__ === 'string' ? __PUBLIC_DEMO_MODE__ : 'disabled';
  } catch {
    // Not defined at all (e.g. running under vitest without the define).
    return 'disabled';
  }
}

function metaContent(name: string): string | undefined {
  const el = document.querySelector(`meta[name="${name}"]`);
  const content = el?.getAttribute('content');
  return content ?? undefined;
}

function urlOverride(): string | undefined {
  try {
    return new URLSearchParams(window.location.search).get('voicedemo') ?? undefined;
  } catch {
    return undefined;
  }
}

/** Only the exact string 'enabled' turns the demo on. */
function toMode(raw: string | undefined): PublicDemoMode | undefined {
  if (raw === undefined) return undefined;
  const value = raw.trim().toLowerCase();
  if (value === 'enabled' || value === 'on' || value === 'true' || value === '1') return 'enabled';
  if (value === 'disabled' || value === 'off' || value === 'false' || value === '0') {
    return 'disabled';
  }
  return undefined;
}

export interface ConfigSources {
  /** Defaults to `window.SEENN_VOICE_DEMO`. */
  inline?: Partial<VoiceDemoConfig> | undefined;
  /** Per-mount `data-` attributes. */
  dataset?: DOMStringMap | undefined;
}

/**
 * Resolves the effective config. Never throws: a misconfigured widget must
 * degrade to `unavailable`, not break the page it is embedded in.
 */
export function resolveConfig(sources: ConfigSources = {}): VoiceDemoConfig {
  const inline = sources.inline ?? (window as { SEENN_VOICE_DEMO?: Partial<VoiceDemoConfig> }).SEENN_VOICE_DEMO;

  const config: VoiceDemoConfig = { ...DEFAULT_CONFIG, ...(inline ?? {}) };

  // Precedence, lowest first.
  const fromBuild = toMode(buildTimeMode());
  const fromMeta = toMode(metaContent('seenn:public-demo-mode'));
  const fromInline = inline?.publicDemoMode ? toMode(inline.publicDemoMode) : undefined;
  const fromUrl = toMode(urlOverride());

  config.publicDemoMode = fromUrl ?? fromInline ?? fromMeta ?? fromBuild ?? 'disabled';

  const dataset = sources.dataset;
  if (dataset) {
    if (dataset.orbSize) config.orbSize = Number(dataset.orbSize) || config.orbSize;
    if (dataset.locale) config.locale = dataset.locale as DemoLocale;
  }

  // A service-role key or LiveKit API secret in the browser is the failure this
  // widget must never have. Refuse the credential and switch the demo off
  // rather than shipping it in a network request.
  if (config.anonKey && looksLikeServerSecret(config.anonKey)) {
    logger.error(
      'refusing to start: the configured key looks like a server-side secret ' +
        '(service_role / API secret). Use the Supabase ANON key.',
    );
    config.anonKey = '';
    config.publicDemoMode = 'disabled';
  }

  return config;
}

/**
 * The demo can only run when the flag is on *and* it has somewhere to call.
 * Returns the reason it cannot, or null when it can.
 */
export function unavailableReason(config: VoiceDemoConfig): string | null {
  if (config.publicDemoMode !== 'enabled') return 'flag_disabled';
  if (!config.endpointBaseUrl || !config.anonKey) return 'endpoint_not_configured';
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return 'browser_unsupported';
  }
  return null;
}
