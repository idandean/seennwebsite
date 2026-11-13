/**
 * Lead source: the fields every lead form adds to its Web3Forms submission so
 * the lead email says where the visitor came from (a ChatGPT ad, Google, a
 * link on another site, or nowhere we can tell).
 *
 * The real `window.SeennLeadSource` module is lifted out of js/script.js and
 * run against a fake window per page load, sharing one fake localStorage, so
 * a visit can be followed across pages the way a visitor would move.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (relative: string): string => readFileSync(path.join(REPO_ROOT, relative), 'utf8');

const SCRIPT_JS = read('js/script.js');

type Fields = Record<string, string>;

interface LeadSource {
  fields(): Fields;
  addTo(formData: FormData): void;
}

interface Visit {
  url: string;
  referrer?: string;
  cookie?: string;
}

function moduleSource(): string {
  const match = SCRIPT_JS.match(/window\.SeennLeadSource\s*=\s*\(function \(window\)\s*\{[\s\S]*?\n\}\)\(window\);/);
  if (!match) throw new Error('no window.SeennLeadSource module found in js/script.js');
  return match[0];
}

function memoryStorage() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => (items.has(key) ? (items.get(key) as string) : null),
    setItem: (key: string, value: string) => void items.set(key, String(value)),
  };
}

type Storage = ReturnType<typeof memoryStorage>;

/** One page load: runs the module fresh, as script.js does in each page's head. */
function pageLoad(visit: Visit, localStorage: Storage | (() => never)): LeadSource {
  const url = new URL(visit.url);
  const host: Record<string, unknown> = {
    location: { href: url.href, pathname: url.pathname, search: url.search },
    document: { referrer: visit.referrer ?? '', cookie: visit.cookie ?? '' },
  };
  if (typeof localStorage === 'function') {
    Object.defineProperty(host, 'localStorage', { get: localStorage });
  } else {
    host.localStorage = localStorage;
  }
  const factory = Function('window', `"use strict"; ${moduleSource()} return window.SeennLeadSource;`);
  return factory(host) as LeadSource;
}

describe('lead source fields', () => {
  let storage: Storage;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-13T10:00:00Z'));
    storage = memoryStorage();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('names a ChatGPT ad click, and keeps the click ID itself out of the email', () => {
    const f = pageLoad(
      { url: 'https://www.seenn.ai/he/?oppref=secret-click-id&utm_source=chatgpt', referrer: 'https://chatgpt.com/' },
      storage,
    ).fields();

    expect(f['Lead source']).toBe('ChatGPT ad');
    expect(f['ChatGPT ad click']).toBe('Yes, 13 Nov 2026, 12:00 Israel time');
    expect(f['Landing page']).toBe('/he/?utm_source=chatgpt (13 Nov 2026, 12:00 Israel time)');
    expect(f['Referring site']).toBe('chatgpt.com/');
    expect(f['Form page']).toBe('/he/');
    expect(JSON.stringify(f)).not.toContain('secret-click-id');
  });

  it('remembers the ad when the lead is sent from another page of the site', () => {
    pageLoad({ url: 'https://www.seenn.ai/he/?oppref=abc', referrer: 'https://chatgpt.com/' }, storage);
    vi.advanceTimersByTime(5 * 60 * 1000);
    const f = pageLoad({ url: 'https://www.seenn.ai/he/contact.html', referrer: 'https://www.seenn.ai/he/' }, storage).fields();

    expect(f['Lead source']).toBe('ChatGPT ad');
    expect(f['Landing page']).toMatch(/^\/he\/ \(/);
    expect(f['Form page']).toBe('/he/contact.html');
  });

  it('treats seenn.ai and www.seenn.ai as the same site', () => {
    pageLoad({ url: 'https://www.seenn.ai/?gclid=x' }, storage);
    const f = pageLoad({ url: 'https://www.seenn.ai/contact.html', referrer: 'https://seenn.ai/' }, storage).fields();
    expect(f['Lead source']).toBe('Google ad');
  });

  it('recognises the ad group tracking parameters as a ChatGPT ad', () => {
    const f = pageLoad(
      { url: 'https://www.seenn.ai/?utm_source=chatgpt&utm_medium=cpc&utm_campaign=123&utm_content=456' },
      storage,
    ).fields();
    expect(f['Lead source']).toBe('ChatGPT ad');
    expect(f['ChatGPT ad click']).toMatch(/^Yes, /);
    expect(f['Landing page']).toContain('utm_campaign=123&utm_content=456');
  });

  it('tells an ordinary ChatGPT answer link apart from an ad', () => {
    const f = pageLoad(
      { url: 'https://www.seenn.ai/?utm_source=chatgpt.com', referrer: 'https://chatgpt.com/' },
      storage,
    ).fields();
    expect(f['Lead source']).toBe('chatgpt.com');
    expect(f['ChatGPT ad click']).toBe('No');
  });

  it('shows the latest outside arrival, while still flagging an earlier ad click', () => {
    pageLoad({ url: 'https://www.seenn.ai/he/?oppref=abc', referrer: 'https://chatgpt.com/' }, storage);
    vi.advanceTimersByTime(2 * 24 * 60 * 60 * 1000);
    const f = pageLoad({ url: 'https://www.seenn.ai/', referrer: 'https://www.google.com/' }, storage).fields();

    expect(f['Lead source']).toBe('From google.com');
    expect(f['ChatGPT ad click']).toBe('Yes, 13 Nov 2026, 12:00 Israel time');
  });

  it('does not let a later direct visit erase where the visitor first came from', () => {
    pageLoad({ url: 'https://www.seenn.ai/', referrer: 'https://www.linkedin.com/' }, storage);
    vi.advanceTimersByTime(60 * 60 * 1000);
    const f = pageLoad({ url: 'https://www.seenn.ai/contact.html' }, storage).fields();
    expect(f['Lead source']).toBe('From linkedin.com');
  });

  it('says so plainly when nothing is known', () => {
    const f = pageLoad({ url: 'https://www.seenn.ai/contact.html' }, storage).fields();
    expect(f).toEqual({
      'Lead source': 'Direct visit or unknown',
      'ChatGPT ad click': 'No',
      'Landing page': '(not recorded)',
      'Referring site': '(none)',
      'Form page': '/contact.html',
    });
  });

  it('trusts the OpenAI Pixel cookie for an ad click it saw before this code did', () => {
    const f = pageLoad({ url: 'https://www.seenn.ai/contact.html', cookie: '_ga=1; __oppref=abc; x=y' }, storage).fields();
    expect(f['ChatGPT ad click']).toBe('Yes');
  });

  it('forgets an arrival after 30 days', () => {
    pageLoad({ url: 'https://www.seenn.ai/he/?oppref=abc', referrer: 'https://chatgpt.com/' }, storage);
    vi.advanceTimersByTime(31 * 24 * 60 * 60 * 1000);
    const f = pageLoad({ url: 'https://www.seenn.ai/contact.html' }, storage).fields();
    expect(f['Lead source']).toBe('Direct visit or unknown');
    expect(f['ChatGPT ad click']).toBe('No');
  });

  it('still works on the landing page itself when storage is blocked', () => {
    const blocked = () => {
      throw new Error('SecurityError');
    };
    let source: LeadSource | undefined;
    expect(() => {
      source = pageLoad({ url: 'https://www.seenn.ai/?oppref=abc', referrer: 'https://chatgpt.com/' }, blocked);
    }).not.toThrow();
    expect(source?.fields()['Lead source']).toBe('ChatGPT ad');
  });

  it('adds the fields to a form submission', () => {
    const formData = new FormData();
    formData.set('email', 'lead@example.com');
    pageLoad({ url: 'https://www.seenn.ai/', referrer: 'https://www.google.com/' }, storage).addTo(formData);

    expect(formData.get('email')).toBe('lead@example.com');
    expect(formData.get('Lead source')).toBe('From google.com');
    expect(formData.get('ChatGPT ad click')).toBe('No');
  });
});

describe('every lead form sends the source', () => {
  const FORMS: ReadonlyArray<readonly [string, string, string]> = [
    ['demo modal (js/script.js)', SCRIPT_JS.slice(SCRIPT_JS.indexOf('async function handleDemoSubmit')), 'fetch('],
    ['contact.html', read('contact.html'), 'JSON.stringify(object)'],
    ['he/contact.html', read('he/contact.html'), 'JSON.stringify(object)'],
  ];

  it.each(FORMS)('%s adds it after reading the form and before sending', (_name, source, sendMarker) => {
    const built = source.indexOf('new FormData(form)');
    const added = source.indexOf('window.SeennLeadSource.addTo(formData)');
    const sent = source.indexOf(sendMarker, built);
    expect(built).toBeGreaterThanOrEqual(0);
    expect(added).toBeGreaterThan(built);
    expect(sent).toBeGreaterThan(added);
  });
});
