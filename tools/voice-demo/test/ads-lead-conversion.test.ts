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

import { createHash, webcrypto } from 'node:crypto';
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
  id: string;
  reported: boolean;
}

type Host = { gtag?: unknown; oaiq?: unknown; crypto?: unknown };

interface SeennLeads {
  SEND_TO: string;
  begin(formName: string): LeadToken | null;
  end(token: LeadToken | null): void;
  reportConversion(token: LeadToken | null, fields?: Record<string, string>): boolean;
}

/**
 * Executes the real helper out of js/script.js. Running the whole file would
 * drag in the page's DOM, so only the self-contained assignment is lifted —
 * verbatim, which is the point: a change to it changes these tests' subject.
 */
function loadSeennLeads(host: Host): SeennLeads {
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

/** The body of the confirmed-success branch of a contact page. */
function contactSuccessBranch(html: string): string {
  const start = html.indexOf('if (response.ok && result && result.success === true) {');
  const end = html.indexOf('\n      } else {', start);
  if (start < 0 || end < 0) throw new Error('could not locate the contact success branch');
  return html.slice(start, end);
}

describe('SeennLeads helper', () => {
  let host: Host;
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

describe('ChatGPT ads lead (OpenAI Measurement Pixel)', () => {
  let host: Host;
  let leads: SeennLeads;
  let gtag: ReturnType<typeof vi.fn>;
  let oaiq: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    gtag = vi.fn();
    oaiq = vi.fn();
    host = { gtag, oaiq };
    leads = loadSeennLeads(host);
  });

  it('sends one lead_created per confirmed lead, keyed by that lead', () => {
    const token = leads.begin('demo');
    leads.reportConversion(token);
    leads.reportConversion(token);

    expect(oaiq).toHaveBeenCalledTimes(1);
    expect(oaiq).toHaveBeenCalledWith(
      'measure',
      'lead_created',
      { type: 'customer_action' },
      { event_id: token?.id },
    );
  });

  it('gives every lead its own event_id, so OpenAI never folds two leads into one', () => {
    const first = leads.begin('contact');
    leads.reportConversion(first);
    leads.end(first);
    const second = leads.begin('contact');
    leads.reportConversion(second);

    const ids = oaiq.mock.calls.map((call) => (call[3] as { event_id: string }).event_id);
    expect(ids).toHaveLength(2);
    expect(ids[0]).toMatch(/^contact-/);
    expect(ids[0]).not.toBe(ids[1]);
  });

  it('still reports the lead to ChatGPT when the Google tag is blocked', () => {
    delete host.gtag;
    leads.reportConversion(leads.begin('demo'));
    expect(oaiq).toHaveBeenCalledTimes(1);
  });

  it('still reports to Google, and does not throw, when the pixel throws', () => {
    host.oaiq = () => {
      throw new Error('pixel exploded');
    };
    let sent = false;
    expect(() => {
      sent = leads.reportConversion(leads.begin('demo'));
    }).not.toThrow();
    expect(sent).toBe(true);
    expect(gtag).toHaveBeenCalledTimes(1);
  });

  it('sends nothing without a token, and stays quiet when the pixel is absent', () => {
    expect(leads.reportConversion(null)).toBe(false);
    expect(oaiq).not.toHaveBeenCalled();

    delete host.oaiq;
    expect(() => leads.reportConversion(leads.begin('contact'))).not.toThrow();
  });

  it('measures lead_created in the shared helper and nowhere else', () => {
    const helper = SCRIPT_JS.match(
      /window\.SeennLeads\s*=\s*\(function \(\)\s*\{[\s\S]*?\n\}\)\(\);/,
    );
    expect(SCRIPT_JS.match(/'lead_created'/g)).toHaveLength(1);
    expect(helper?.[0]).toContain("'lead_created'");
    expect(CONTACT_EN).not.toContain('lead_created');
    expect(CONTACT_HE).not.toContain('lead_created');
  });

  it('loads the pixel SDK from OpenAI once, from js/script.js only', () => {
    expect(SCRIPT_JS.match(/bzrcdn\.openai\.com\/sdk\/oaiq\.min\.js/g)).toHaveLength(1);
    // The Pixel ID Ads Manager issued for www.seenn.ai.
    expect(SCRIPT_JS).toContain("var OPENAI_PIXEL_ID = 'Xe92xhf6SHebGah2EKoQdk';");
    for (const page of ['index.html', 'he/index.html', 'contact.html', 'he/contact.html']) {
      expect(read(page)).not.toContain('oaiq.min.js');
    }
  });
});

describe('ChatGPT ads lead: hashed identifiers for matching', () => {
  const sha = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');
  const measured = (oaiq: ReturnType<typeof vi.fn>) =>
    oaiq.mock.calls.filter((call) => call[0] === 'measure' && call[1] === 'lead_created');
  const sentUser = (oaiq: ReturnType<typeof vi.fn>) =>
    (oaiq.mock.calls.find((call) => call[0] === 'init')?.[1] as { user: Record<string, string> } | undefined)?.user;

  let host: Host;
  let leads: SeennLeads;
  let gtag: ReturnType<typeof vi.fn>;
  let oaiq: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    gtag = vi.fn();
    oaiq = vi.fn();
    host = { gtag, oaiq, crypto: webcrypto };
    leads = loadSeennLeads(host);
  });

  async function report(fields: Record<string, string>) {
    const token = leads.begin('demo');
    const googleSent = leads.reportConversion(token, fields);
    await vi.waitFor(() => expect(measured(oaiq)).toHaveLength(1));
    return { token, googleSent };
  }

  it('sends hashed email, phone and name with the lead, init first', async () => {
    const { token } = await report({
      firstName: 'Mary Jane',
      lastName: "O'Connor",
      email: '  Dana.Levi@Example.COM ',
      phone: '050-123-4567',
      message: 'never hashed',
    });

    expect(oaiq.mock.calls.map((call) => call[0])).toEqual(['init', 'measure']);
    expect(sentUser(oaiq)).toEqual({
      email_sha256: sha('dana.levi@example.com'),
      phone_number_sha256: sha('972501234567'),
      first_name_sha256: sha('maryjane'),
      last_name_sha256: sha('oconnor'),
    });
    expect(oaiq).toHaveBeenLastCalledWith('measure', 'lead_created', { type: 'customer_action' }, { event_id: token?.id });
  });

  it('never hands the Pixel a raw value', async () => {
    await report({ name: 'דנה לוי', email: 'dana@example.com', phone: '+972 50-123-4567' });
    const sent = JSON.stringify(oaiq.mock.calls);
    expect(sent).not.toContain('dana@example.com');
    expect(sent).not.toContain('דנה');
    expect(sent).not.toContain('50-123');
  });

  it('splits the demo form\'s single full-name field, keeping Hebrew as typed', async () => {
    await report({ name: '  דנה  לוי כהן ', email: 'x@example.com' });
    expect(sentUser(oaiq)).toMatchObject({ first_name_sha256: sha('דנה'), last_name_sha256: sha('לויכהן') });
  });

  it.each([
    ['050-123-4567', '972501234567'],
    ['0501234567', '972501234567'],
    ['+972 50-123-4567', '972501234567'],
    ['00972501234567', '972501234567'],
    ['(03) 123-4567', '97231234567'],
    ['+1 (415) 555-2671', '14155552671'],
  ])('normalises the phone %s the way OpenAI asks (%s)', async (typed, normalised) => {
    await report({ email: 'x@example.com', phone: typed });
    expect(sentUser(oaiq)?.phone_number_sha256).toBe(sha(normalised));
  });

  it.each(['12', 'call me', '+'])('drops a phone that cannot be a real number (%s) and keeps the rest', async (typed) => {
    await report({ email: 'x@example.com', phone: typed });
    expect(sentUser(oaiq)).toEqual({ email_sha256: sha('x@example.com') });
  });

  it('sends the lead without init when nothing usable was typed', async () => {
    await report({ email: '   ', phone: '', name: '' });
    expect(oaiq.mock.calls.map((call) => call[0])).toEqual(['measure']);
  });

  it('keeps the Google Ads conversion immediate while the hashing runs', async () => {
    const { googleSent } = await report({ email: 'x@example.com' });
    expect(googleSent).toBe(true);
    expect(gtag).toHaveBeenCalledTimes(1);
  });

  it('still sends the lead, once, when init throws', async () => {
    host.oaiq = vi.fn((command: string) => {
      if (command === 'init') throw new Error('bad user data');
    });
    oaiq = host.oaiq as ReturnType<typeof vi.fn>;
    await report({ email: 'x@example.com' });
    expect(measured(oaiq)).toHaveLength(1);
  });

  it('falls back to a plain lead, sent at once, without Web Crypto', () => {
    delete host.crypto;
    leads.reportConversion(leads.begin('demo'), { email: 'x@example.com' });
    expect(oaiq.mock.calls.map((call) => call[0])).toEqual(['measure']);
  });

  it('falls back to a plain lead when hashing fails', async () => {
    host.crypto = { subtle: { digest: () => Promise.reject(new Error('no digest')) } };
    await report({ email: 'x@example.com' });
    expect(oaiq.mock.calls.map((call) => call[0])).toEqual(['measure']);
  });

  it('reports one lead per submission even with fields', async () => {
    const token = leads.begin('contact');
    leads.reportConversion(token, { email: 'x@example.com' });
    leads.reportConversion(token, { email: 'x@example.com' });
    await vi.waitFor(() => expect(measured(oaiq)).toHaveLength(1));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(measured(oaiq)).toHaveLength(1);
  });
});

describe('lead form submit handlers', () => {
  const BRANCHES: ReadonlyArray<readonly [string, () => string]> = [
    ['demo modal (js/script.js)', demoSuccessBranch],
    ['contact.html', () => contactSuccessBranch(CONTACT_EN)],
    ['he/contact.html', () => contactSuccessBranch(CONTACT_HE)],
  ];

  it.each(BRANCHES)('%s reports the conversion on success', (_name, branch) => {
    expect(branch()).toMatch(/reportConversion\(lead\b/);
  });

  it.each(BRANCHES)('%s hands the submitted values over for ChatGPT ads matching', (_name, branch) => {
    // The values must come from the submitted data, not the form fields,
    // which are cleared by form.reset() right after.
    expect(branch()).toMatch(/reportConversion\(lead, (Object\.fromEntries\(formData\)|object)\)/);
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
    expect(source.match(/reportConversion\(lead\b/g)).toHaveLength(1);
  });

  it.each([
    ['contact.html', CONTACT_EN],
    ['he/contact.html', CONTACT_HE],
  ])('%s counts a lead only when Web3Forms says success, and shows the result without alert()', (_name, html) => {
    expect(html).not.toContain('response.status == 200');
    expect(html).toContain('if (response.ok && result && result.success === true) {');
    const handler = html.slice(html.indexOf("form.addEventListener('submit'"));
    expect(handler).not.toMatch(/\balert\(/);
    expect(html).toContain('id="contactFormMessage"');
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
