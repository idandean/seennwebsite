/**
 * The Google Ads "Submit lead form" conversion.
 *
 * Two halves, both reading the COMMITTED files rather than fixtures:
 *
 *   - the shared `window.SeennLeads` helper in js/script.js is pulled out of
 *     the real file and executed, so the guards below are the ones that ship;
 *   - each of the three lead-form submit handlers (the demo modal in
 *     js/script.js, contact.html, he/contact.html) is checked for the
 *     conversion call sitting inside its success branch — and for the GA4
 *     generate_lead event still sitting right beside it.
 *
 * The site loads exactly one Google tag (G-B5T6RW2PE6) per page and reaches
 * the Ads destination through it; a second gtag.js loader would double-count
 * everything, so that is asserted too.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (relative: string): string => readFileSync(path.join(REPO_ROOT, relative), 'utf8');

const SCRIPT_JS = read('js/script.js');
const CONTACT_EN = read('contact.html');
const CONTACT_HE = read('he/contact.html');

const SEND_TO = 'AW-18397476304/ifXfCJvI-OMcENDrzMRE';

interface LeadToken {
  form: string;
  reported: boolean;
}

interface SeennLeads {
  SEND_TO: string;
  begin(formName: string): LeadToken | null;
  end(token: LeadToken | null): void;
  reportConversion(token: LeadToken | null): boolean;
}

/**
 * Executes the real helper out of js/script.js. Running the whole file would
 * drag in the page's DOM, so only the self-contained assignment is lifted —
 * verbatim, which is the point: a change to it changes these tests' subject.
 */
function loadSeennLeads(host: { gtag?: unknown }): SeennLeads {
  const match = SCRIPT_JS.match(/window\.SeennLeads\s*=\s*\(function \(\)\s*\{[\s\S]*?\n\}\)\(\);/);
  if (!match) throw new Error('no window.SeennLeads assignment found in js/script.js');
  const factory = Function('window', `"use strict"; ${match[0]} return window.SeennLeads;`);
  return factory(host) as SeennLeads;
}

/** The body of the `if (data.success) { ... }` branch of handleDemoSubmit. */
function demoSuccessBranch(): string {
  const handler = SCRIPT_JS.slice(SCRIPT_JS.indexOf('async function handleDemoSubmit'));
  const start = handler.indexOf('if (data.success) {');
  const end = handler.indexOf('\n        } else {', start);
  if (start < 0 || end < 0) throw new Error('could not locate the demo success branch');
  return handler.slice(start, end);
}

/** The body of the `if (response.status == 200) { ... }` branch of a contact page. */
function contactSuccessBranch(html: string): string {
  const start = html.indexOf('if (response.status == 200) {');
  const end = html.indexOf('\n      } else {', start);
  if (start < 0 || end < 0) throw new Error('could not locate the contact success branch');
  return html.slice(start, end);
}

describe('SeennLeads helper', () => {
  let host: { gtag?: unknown };
  let leads: SeennLeads;
  let gtag: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    gtag = vi.fn();
    host = { gtag };
    leads = loadSeennLeads(host);
  });

  it('sends the conversion Google Ads expects, once, on a confirmed lead', () => {
    const token = leads.begin('contact');
    expect(leads.reportConversion(token)).toBe(true);

    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag).toHaveBeenCalledWith('event', 'conversion', {
      send_to: SEND_TO,
      value: 1.0,
      currency: 'ILS',
    });
  });

  it('carries the conversion label Google issued for "Submit lead form"', () => {
    expect(leads.SEND_TO).toBe(SEND_TO);
  });

  it('ignores a success path that runs twice for the same submission', () => {
    const token = leads.begin('contact');
    leads.reportConversion(token);
    expect(leads.reportConversion(token)).toBe(false);

    expect(gtag).toHaveBeenCalledTimes(1);
  });

  it('refuses a second submission while the first is still on the wire', () => {
    const first = leads.begin('demo');
    expect(first).not.toBeNull();
    expect(leads.begin('demo')).toBeNull();

    // ...and a failed request that never reported still frees the form.
    leads.end(first);
    const second = leads.begin('demo');
    expect(second).not.toBeNull();
    expect(leads.reportConversion(second)).toBe(true);
    expect(gtag).toHaveBeenCalledTimes(1);
  });

  it('reports a genuine second lead from the same form', () => {
    const first = leads.begin('contact');
    leads.reportConversion(first);
    leads.end(first);

    const second = leads.begin('contact');
    expect(leads.reportConversion(second)).toBe(true);
    expect(gtag).toHaveBeenCalledTimes(2);
  });

  it('keeps the forms independent of each other', () => {
    expect(leads.begin('contact')).not.toBeNull();
    expect(leads.begin('demo')).not.toBeNull();
  });

  it('fires nothing without a token — no page load, no click, no failure', () => {
    expect(leads.reportConversion(null)).toBe(false);
    expect(gtag).not.toHaveBeenCalled();
  });

  it('stays silent, and does not throw, when gtag is blocked or absent', () => {
    delete host.gtag;
    expect(() => leads.reportConversion(leads.begin('contact'))).not.toThrow();
  });
});

describe('lead form submit handlers', () => {
  const BRANCHES: ReadonlyArray<readonly [string, () => string]> = [
    ['demo modal (js/script.js)', demoSuccessBranch],
    ['contact.html', () => contactSuccessBranch(CONTACT_EN)],
    ['he/contact.html', () => contactSuccessBranch(CONTACT_HE)],
  ];

  it.each(BRANCHES)('%s reports the conversion on success', (_name, branch) => {
    expect(branch()).toMatch(/reportConversion\(lead\)/);
  });

  it.each(BRANCHES)('%s still emits the GA4 generate_lead event', (_name, branch) => {
    expect(branch()).toMatch(/gtag\('event', 'generate_lead'/);
  });

  const SOURCES: ReadonlyArray<readonly [string, string]> = [
    ['js/script.js', SCRIPT_JS],
    ['contact.html', CONTACT_EN],
    ['he/contact.html', CONTACT_HE],
  ];

  it.each(SOURCES)('%s takes a submission token before firing anything', (_name, source) => {
    expect(source).toMatch(/begin\('(contact|demo)'\)/);
    expect(source).toMatch(/\.end\(lead\)/);
  });

  it.each(SOURCES)('%s reports the conversion nowhere else', (_name, source) => {
    // One call site per file: the success branch. Nothing on load, on click,
    // on a validation failure, or in an error handler.
    expect(source.match(/reportConversion\(lead\)/g)).toHaveLength(1);
  });

  it('routes every conversion through the shared helper', () => {
    // A hand-rolled conversion event at a call site would bypass the one-shot
    // guard, so the only event/conversion in the codebase is the helper's own.
    expect(CONTACT_EN).not.toMatch(/'event',\s*'conversion'/);
    expect(CONTACT_HE).not.toMatch(/'event',\s*'conversion'/);
    expect(SCRIPT_JS.match(/'event',\s*'conversion'/g)).toHaveLength(1);

    const helper = SCRIPT_JS.match(
      /window\.SeennLeads\s*=\s*\(function \(\)\s*\{[\s\S]*?\n\}\)\(\);/,
    );
    expect(helper?.[0]).toMatch(/'event',\s*'conversion'/);
    expect(helper?.[0]).toContain(SEND_TO);
  });
});

describe('the single Google tag', () => {
  const PAGES = ['index.html', 'he/index.html', 'contact.html', 'he/contact.html'] as const;

  it.each(PAGES)('%s loads gtag.js exactly once', (page) => {
    const html = read(page);
    expect(html.match(/googletagmanager\.com\/gtag\/js/g)).toHaveLength(1);
    expect(html).toContain("gtag('config', 'G-B5T6RW2PE6')");
  });

  it.each(PAGES)('%s adds no second Google Ads tag of its own', (page) => {
    // AW-18397476304 is reached as a linked destination of the existing tag;
    // an extra loader or config here would be a second, competing setup.
    expect(read(page)).not.toMatch(/gtag\('config',\s*'AW-/);
  });
});
