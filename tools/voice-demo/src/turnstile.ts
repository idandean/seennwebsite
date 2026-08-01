/**
 * Cloudflare Turnstile, invisible mode.
 *
 * The rule this module exists to enforce: **one fresh token per POST**.
 * Turnstile tokens are single-use and short-lived, so a cached one is either
 * rejected by siteverify or — worse — replayable. `getToken()` therefore
 * always resets the widget before executing, and the caller discards the token
 * as soon as the request finishes, success or failure.
 *
 * The script is fetched lazily, on the first token request, so a page with the
 * demo switched off makes no request to Cloudflare at all.
 */

import { logger } from './logging';

export interface TurnstileProvider {
  /** Resolves a fresh, single-use token. Rejects if one cannot be obtained. */
  getToken(): Promise<string>;
  /** Discards the current token/challenge. Safe to call repeatedly. */
  reset(): void;
  destroy(): void;
}

/** The slice of the Turnstile API we use. */
interface TurnstileApi {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      size?: string;
      action?: string;
      callback?: (token: string) => void;
      'error-callback'?: (code?: string) => void;
      'timeout-callback'?: () => void;
    },
  ): string;
  execute(widgetId: string): void;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export const TURNSTILE_SCRIPT_URL =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

/**
 * Sent with every challenge and echoed back in the siteverify response, so the
 * backend can confirm a token was minted for *this* flow rather than lifted
 * from another Turnstile widget on another Seenn page.
 *
 * The backend must compare siteverify's `action` against this exact string.
 * Changing it here without changing it there breaks verification.
 */
export const TURNSTILE_ACTION = 'public_voice_demo';

export class TurnstileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TurnstileError';
  }
}

export interface TurnstileOptions {
  siteKey: string;
  /** Injected in tests so no script is fetched. */
  loadScript?: () => Promise<TurnstileApi>;
  /** How long a single challenge may take before we give up. */
  timeoutMs?: number;
}

function loadTurnstileScript(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);

  return new Promise<TurnstileApi>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src^="https://challenges.cloudflare.com/turnstile/"]`,
    );

    const onReady = (): void => {
      if (window.turnstile) resolve(window.turnstile);
      else reject(new TurnstileError('turnstile script loaded but exposed no API'));
    };

    if (existing) {
      existing.addEventListener('load', onReady, { once: true });
      existing.addEventListener(
        'error',
        () => reject(new TurnstileError('turnstile script failed to load')),
        { once: true },
      );
      return;
    }

    const script = document.createElement('script');
    script.src = TURNSTILE_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', onReady, { once: true });
    script.addEventListener(
      'error',
      () => reject(new TurnstileError('turnstile script failed to load')),
      { once: true },
    );
    document.head.appendChild(script);
  });
}

export function createTurnstileProvider(options: TurnstileOptions): TurnstileProvider {
  const timeoutMs = options.timeoutMs ?? 20_000;
  const load = options.loadScript ?? loadTurnstileScript;

  let api: TurnstileApi | null = null;
  let widgetId: string | null = null;
  let container: HTMLElement | null = null;
  let pending: { resolve: (token: string) => void; reject: (error: Error) => void } | null = null;
  let destroyed = false;

  function settle(fn: 'resolve' | 'reject', value: string | Error): void {
    const current = pending;
    pending = null;
    if (!current) return;
    if (fn === 'resolve') current.resolve(value as string);
    else current.reject(value as Error);
  }

  async function ensureWidget(): Promise<TurnstileApi> {
    if (!api) api = await load();
    if (destroyed) throw new TurnstileError('turnstile provider was destroyed');

    if (widgetId === null) {
      container = document.createElement('div');
      container.setAttribute('aria-hidden', 'true');
      container.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
      document.body.appendChild(container);

      widgetId = api.render(container, {
        sitekey: options.siteKey,
        size: 'invisible',
        action: TURNSTILE_ACTION,
        callback: (token: string) => settle('resolve', token),
        'error-callback': (code?: string) =>
          settle('reject', new TurnstileError(`turnstile challenge failed${code ? `: ${code}` : ''}`)),
        'timeout-callback': () =>
          settle('reject', new TurnstileError('turnstile challenge timed out')),
      });
    }

    return api;
  }

  return {
    /**
     * Deliberately not `async`: `pending` must be established synchronously,
     * before any await. Loading the script is asynchronous, so an async
     * function would leave a window in which a second call sails past the
     * in-flight guard and `reset()` finds nothing to cancel — orphaning the
     * first promise forever.
     */
    getToken(): Promise<string> {
      if (destroyed) return Promise.reject(new TurnstileError('turnstile provider was destroyed'));
      if (pending) {
        return Promise.reject(new TurnstileError('a turnstile challenge is already in flight'));
      }

      return new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => {
          settle('reject', new TurnstileError('turnstile challenge timed out'));
        }, timeoutMs);

        // Whichever way this settles, the timer must not outlive it.
        pending = {
          resolve: (token: string) => {
            clearTimeout(timer);
            resolve(token);
          },
          reject: (error: Error) => {
            clearTimeout(timer);
            reject(error);
          },
        };

        void ensureWidget()
          .then((instance) => {
            // reset() or destroy() may already have settled this attempt while
            // the script was loading.
            if (!pending) return;

            const id = widgetId;
            if (id === null) {
              settle('reject', new TurnstileError('turnstile widget was not rendered'));
              return;
            }

            // Always reset before executing: a token is single-use, and a
            // stale challenge would hand back the same one twice.
            instance.reset(id);
            instance.execute(id);
          })
          .catch((cause: unknown) => {
            settle(
              'reject',
              cause instanceof Error ? cause : new TurnstileError(String(cause)),
            );
          });
      });
    },

    reset(): void {
      settle('reject', new TurnstileError('turnstile challenge was reset'));
      if (api && widgetId !== null) {
        try {
          api.reset(widgetId);
        } catch (cause) {
          logger.warn('turnstile reset failed', cause);
        }
      }
    },

    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      settle('reject', new TurnstileError('turnstile provider was destroyed'));
      if (api && widgetId !== null) {
        try {
          api.remove(widgetId);
        } catch {
          // A widget that will not unmount is still one we are done with.
        }
      }
      widgetId = null;
      container?.remove();
      container = null;
    },
  };
}
