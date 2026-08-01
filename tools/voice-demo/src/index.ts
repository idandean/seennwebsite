/**
 * Entry point. Bundled by scripts/build.mjs into /js/voice-demo.js.
 *
 * Mounts on every `[data-seenn-voice-demo]` element. When PUBLIC_DEMO_MODE is
 * not `enabled` — the default — it renders nothing at all and releases the
 * height the stylesheet reserved, so a marketing page does not advertise a demo
 * it cannot give.
 */

import { resolveConfig, unavailableReason } from './config';
import { isSupported, resolveLocale } from './i18n';
import { VoiceDemoWidget } from './widget';
import { logger } from './logging';
import type { DemoLocale } from './contract';

declare global {
  interface HTMLElement {
    __seennVoiceDemo?: VoiceDemoWidget;
  }
}

const MOUNT_SELECTOR = '[data-seenn-voice-demo]';

function mountAll(): void {
  const mounts = document.querySelectorAll<HTMLElement>(MOUNT_SELECTOR);

  mounts.forEach((mount) => {
    if (mount.dataset['svdReady']) return;

    const config = resolveConfig({ dataset: mount.dataset });
    const blocked = unavailableReason(config);

    // Flag off, or nothing to call: leave the mount hidden exactly as the page
    // shipped it. The stylesheet reserves no height for a hidden mount, so a
    // disabled demo costs the page nothing and never flashes an empty gap.
    if (blocked && !config.renderWhenUnavailable) {
      mount.hidden = true;
      mount.setAttribute('data-svd-state', `hidden:${blocked}`);
      if (blocked === 'endpoint_not_configured' && config.publicDemoMode === 'enabled') {
        logger.warn(
          'PUBLIC_DEMO_MODE is enabled but no endpoint/anon key is configured — widget hidden.',
        );
      }
      return;
    }

    // Only now does the widget claim its space.
    mount.hidden = false;
    mount.dataset['svdReady'] = '1';
    const widget = new VoiceDemoWidget(mount, config);
    mount.__seennVoiceDemo = widget;

    watchPageLocale(widget, config.locale);
  });
}

/**
 * The homepage language toggle rewrites <html lang> in place rather than
 * navigating, and it runs on DOMContentLoaded — after this deferred bundle has
 * already mounted. Following the attribute is what keeps a returning Hebrew
 * visitor from seeing an English widget.
 */
function watchPageLocale(widget: VoiceDemoWidget, configured: DemoLocale | null): void {
  if (configured || typeof MutationObserver !== 'function') return;

  const observer = new MutationObserver(() => {
    const next = resolveLocale(null, document.documentElement.getAttribute('lang'));
    if (isSupported(next)) widget.setLocale(next);
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountAll);
} else {
  mountAll();
}

export { VoiceDemoWidget };
