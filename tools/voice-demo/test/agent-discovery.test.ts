/**
 * The machine-readable surface agents discover the site through, read from the
 * COMMITTED files: vercel.json routing for Markdown negotiation and 404s,
 * llms.txt (https://llmstxt.org format), sitemap.xml, the Markdown twins, the
 * developer page, and the Organization JSON-LD on both homepages.
 */

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { MARKDOWN, negotiate } from '../src/accept';
import { PAGES } from '../src/api/agent-markdown';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (relative: string): string => readFileSync(path.join(REPO_ROOT, relative), 'utf8');

const SITE = 'https://www.seenn.ai';

/** Maps a site URL path to the file Vercel serves for it, or null. */
function fileForPath(urlPath: string): string | null {
  const clean = decodeURIComponent(urlPath.split('#')[0]!.split('?')[0]!);
  const candidate = clean.endsWith('/') ? `${clean}index.html` : clean;
  const relative = candidate.replace(/^\//, '');
  return existsSync(path.join(REPO_ROOT, relative)) ? relative : null;
}

function jsonLd(html: string): unknown[] {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) =>
    JSON.parse(m[1]!),
  );
}

function byType(blocks: unknown[], type: string): Record<string, unknown> | undefined {
  return blocks.find((b) => (b as Record<string, unknown>)['@type'] === type) as
    | Record<string, unknown>
    | undefined;
}

const html = (relative: string): Document => new DOMParser().parseFromString(read(relative), 'text/html');

const norm = (text: string): string => text.replace(/\s+/g, ' ').replace(/`/g, '').trim();

describe('vercel.json: Markdown negotiation and agent 404s', () => {
  const config = JSON.parse(read('vercel.json')) as {
    redirects: { source: string; destination: string }[];
    routes: { src: string; dest: string; has?: { type: string; key: string; value: string }[] }[];
    rewrites: { source: string; destination: string; has?: { type: string; key: string; value: string }[] }[];
    headers: {
      source: string;
      headers: { key: string; value: string }[];
      missing?: { type: string; key: string; value: string }[];
    }[];
  };

  const acceptCondition = (has: { type: string; key: string; value: string }[] | undefined) =>
    has?.find((h) => h.type === 'header' && h.key === 'accept');

  it('keeps the canonical-host and index.html redirects', () => {
    expect(config.redirects.map((r) => [r.source, r.destination])).toEqual([
      ['/index.html', '/'],
      ['/he/index.html', '/he/'],
      ['/:path*', 'https://www.seenn.ai/:path*'],
      ['/:path*', 'https://www.seenn.ai/:path*'],
    ]);
  });

  it('routes exactly the pages that have a Markdown twin, and only Markdown-asking requests', () => {
    const routed = config.routes.map((route) => {
      expect(acceptCondition(route.has), route.src).toBeDefined();
      const page = new URL(route.dest, SITE).searchParams.get('seenn_page');
      return [route.src, page];
    });
    expect(routed).toEqual(
      Object.entries(PAGES).map(([name, page]) => [
        `^${page.htmlPath.replace(/\./g, '\\.')}$`,
        name,
      ]),
    );
    for (const route of config.routes) expect(route.dest.startsWith('/api/agent-markdown?')).toBe(true);
  });

  it('the 404 catch-all is a rewrite, never a route', () => {
    // Vercel applies rewrites only after the filesystem misses
    // ({"handle":"filesystem"} sits between routes and rewrites), which is the
    // only thing keeping an existing page from being answered with a 404.
    // As a `routes` entry it would run before the filesystem and 404 every page.
    expect(config.rewrites).toHaveLength(1);
    const [rewrite] = config.rewrites;
    expect(rewrite!.source).toBe('/:path*');
    expect(acceptCondition(rewrite!.has)).toBeDefined();
    expect(rewrite!.destination).toBe('/api/agent-markdown?seenn_missing=1');
    for (const route of config.routes) {
      expect(route.src === '^/$' || route.src.endsWith('\\.html$'), route.src).toBe(true);
    }
  });

  it('every negotiable page varies on Accept and advertises its Markdown twin to everyone else', () => {
    for (const page of Object.values(PAGES)) {
      const rules = config.headers.filter((rule) => rule.source === page.htmlPath);
      const vary = rules.find((rule) => rule.headers.some((h) => h.key === 'Vary'));
      expect(vary?.headers).toEqual([{ key: 'Vary', value: 'Accept' }]);
      expect(vary?.missing).toBeUndefined();

      const link = rules.find((rule) => rule.headers.some((h) => h.key === 'Link'));
      expect(link?.headers).toEqual([
        { key: 'Link', value: `<${page.markdownPath}>; rel="alternate"; type="text/markdown"` },
      ]);
      // The function sets its own Link on Markdown responses; never both.
      expect(acceptCondition(link?.missing)).toBeDefined();
    }
  });

  it('the Markdown twins point search engines back at the HTML page', () => {
    for (const page of Object.values(PAGES)) {
      const rule = config.headers.find((r) => r.source === page.markdownPath);
      expect(rule?.headers).toEqual([{ key: 'Link', value: `<${page.canonical}>; rel="canonical"` }]);
    }
  });

  it('every condition uses the same Accept pattern, and it catches every header that names text/markdown', () => {
    const values = new Set([
      ...config.routes.map((r) => acceptCondition(r.has)!.value),
      ...config.rewrites.map((r) => acceptCondition(r.has)!.value),
      ...config.headers.flatMap((r) => (r.missing ? [acceptCondition(r.missing)!.value] : [])),
    ]);
    expect(values.size).toBe(1);
    const [value] = [...values];
    // Vercel may anchor the pattern or not; it has to work either way.
    for (const pattern of [new RegExp(`^(?:${value!})$`), new RegExp(value!)]) {
      for (const accept of [
        'text/markdown',
        'text/markdown, text/html, */*',
        'text/html;q=0.9, text/markdown',
        'TEXT/MARKDOWN',
        'Text/Markdown;q=0.5',
        'text/markdown;q=0',
      ]) {
        expect(pattern.test(accept), accept).toBe(true);
      }
      for (const accept of [
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        '*/*',
        'text/html',
        'application/json',
        'text/x-markdown',
        '',
      ]) {
        expect(pattern.test(accept), accept).toBe(false);
      }
    }
  });

  it('no header that negotiates to Markdown by naming it slips past the pattern', () => {
    const pattern = new RegExp(`^(?:${acceptCondition(config.routes[0]!.has)!.value})$`);
    const corpus = [
      'text/markdown', 'text/markdown, text/html', 'text/html;q=0.5, text/markdown',
      'text/markdown;q=0.9, text/html;q=0.8', 'text/markdown, */*', 'text/plain, text/markdown',
      'TEXT/MARKDOWN;Q=1', 'text/markdown;variant=GFM',
    ];
    for (const accept of corpus) {
      if (negotiate(accept) === MARKDOWN) expect(pattern.test(accept), accept).toBe(true);
    }
  });
});

describe('Markdown twins', () => {
  it.each(Object.entries(PAGES))('%s: the HTML page and its Markdown twin both exist', (_name, page) => {
    expect(fileForPath(page.htmlPath), page.htmlPath).not.toBeNull();
    const markdown = read(page.markdownPath.slice(1));
    expect(markdown.startsWith('# ')).toBe(true);
    expect(markdown.trim().length).toBeGreaterThan(500);
    // Advertised from the HTML head as well as by header.
    const doc = html(fileForPath(page.htmlPath)!);
    const alternate = doc.querySelector('link[rel="alternate"][type="text/markdown"]');
    expect(alternate?.getAttribute('href')).toBe(page.markdownPath);
  });

  it.each(Object.values(PAGES).map((p) => p.markdownPath))('%s: every site link resolves to a real page', (mdPath) => {
    const markdown = read(mdPath.slice(1));
    const links = [...markdown.matchAll(/\]\((https:\/\/www\.seenn\.ai[^)\s]*)\)/g)].map((m) => m[1]!);
    expect(links.length).toBeGreaterThan(3);
    for (const link of links) expect(fileForPath(new URL(link).pathname), link).not.toBeNull();
  });

  it.each(Object.values(PAGES).map((p) => p.markdownPath))('%s: follows the site copy rules', (mdPath) => {
    const markdown = read(mdPath.slice(1));
    expect(markdown).toContain('Shira');
    expect(markdown).not.toMatch(/\bJess\b/);
    expect(markdown).not.toMatch(/receptionist|Michael/i);
    expect(markdown).not.toContain('60%');
    // The Israeli line stays off English pages until there is a US number.
    expect(markdown).not.toMatch(/\+972|055-931/);
  });

  it('index.md carries the homepage positioning: three channels, phone first', () => {
    const markdown = read('index.md');
    expect(markdown).toMatch(/^# Seenn: AI Accounts Receivable Agent/);
    expect(markdown).toContain('https://www.seenn.ai/');
    for (const channel of ['### Phone call', '### WhatsApp', '### Email']) expect(markdown).toContain(channel);
    expect(markdown.indexOf('### Phone call')).toBeLessThan(markdown.indexOf('### WhatsApp'));
    expect(markdown).toContain('up to 40%');
  });
});

describe('developer page (developers.html + developers.md)', () => {
  const doc = html('developers.html');
  const blocks = jsonLd(read('developers.html'));

  it('names the product and "API" in the title and the one H1', () => {
    const title = doc.querySelector('title')!.textContent!;
    expect(title).toContain('Seenn');
    expect(title).toContain('API');
    expect(title.length).toBeLessThanOrEqual(60);
    const h1s = doc.querySelectorAll('h1');
    expect(h1s).toHaveLength(1);
    expect(h1s[0]!.textContent).toContain('Seenn API');
    const description = doc.querySelector('meta[name="description"]')!.getAttribute('content')!;
    expect(description.length).toBeLessThanOrEqual(155);
  });

  it('is canonical and English-only, like the comparison pages', () => {
    expect(doc.querySelector('link[rel="canonical"]')!.getAttribute('href')).toBe(`${SITE}/developers.html`);
    const hreflangs = [...doc.querySelectorAll('link[hreflang]')].map((l) => [
      l.getAttribute('hreflang'),
      l.getAttribute('href'),
    ]);
    expect(hreflangs).toEqual([
      ['en', `${SITE}/developers.html`],
      ['x-default', `${SITE}/developers.html`],
    ]);
  });

  it('has WebPage, BreadcrumbList and FAQPage JSON-LD that parses', () => {
    expect(blocks.map((b) => (b as Record<string, unknown>)['@type'])).toEqual([
      'WebPage',
      'BreadcrumbList',
      'FAQPage',
    ]);
  });

  it('the visible FAQ, the FAQPage schema and the Markdown twin say the same thing', () => {
    const faq = byType(blocks, 'FAQPage')!['mainEntity'] as {
      name: string;
      acceptedAnswer: { text: string };
    }[];
    const visible = [...doc.querySelectorAll('.cs-faq details')].map((d) => [
      norm(d.querySelector('summary')!.textContent!),
      norm(d.querySelector('p')!.textContent!),
    ]);
    expect(visible).toEqual(faq.map((q) => [norm(q.name), norm(q.acceptedAnswer.text)]));

    const markdown = read('developers.md');
    const faqSection = markdown.slice(markdown.indexOf('## Developer FAQ'));
    const mdFaq = [...faqSection.matchAll(/^### (.+)\n\n([\s\S]+?)(?=\n\n### |\n\n© )/gm)].map((m) => [
      norm(m[1]!),
      norm(m[2]!),
    ]);
    expect(mdFaq).toEqual(visible);
  });

  it('is linked from the homepage footer, llms.txt and the sitemap', () => {
    expect(html('index.html').querySelector('footer a[href="/developers.html"]')).not.toBeNull();
    expect(read('llms.txt')).toContain('(https://www.seenn.ai/developers.html)');
    expect(read('sitemap.xml')).toContain('<loc>https://www.seenn.ai/developers.html</loc>');
  });

  it('does not claim a public API, SDK or MCP server that does not exist', () => {
    const text = norm(doc.body.textContent!);
    expect(text).toContain('no self-serve API key, public SDK or published endpoint reference today');
    expect(text).toContain('Seenn does not publish an MCP server, SDK or command-line tool');
    expect(text).not.toMatch(/\bJess\b|\+972/);
  });
});

describe('Organization JSON-LD on both homepages', () => {
  it.each(['index.html', 'he/index.html'])('%s: every block parses; contactPoint and address are complete', (file) => {
    const org = byType(jsonLd(read(file)), 'Organization')!;
    expect(org['legalName']).toBe('Seenn Inc.');
    // Seenn Inc.'s registered address, as given by the founder (2026-11-09).
    expect(org['address']).toEqual({
      '@type': 'PostalAddress',
      streetAddress: '131 Continental Drive, Suite 305',
      addressLocality: 'Newark',
      addressRegion: 'DE',
      postalCode: '19713',
      addressCountry: 'US',
    });

    const points = org['contactPoint'] as Record<string, unknown>[];
    expect(points.length).toBeGreaterThanOrEqual(1);
    for (const point of points) {
      expect(point['@type']).toBe('ContactPoint');
      expect(typeof point['contactType']).toBe('string');
      expect(point['email'] ?? point['telephone']).toBeTruthy();
    }
    expect(points.some((p) => p['email'] === 'hello@seenn.ai')).toBe(true);
    // The only phone anywhere is the published Seenn line.
    for (const point of points) {
      if (point['telephone'] !== undefined) expect(point['telephone']).toBe('+972-55-931-1784');
    }
    expect(org['sameAs']).toContain('https://www.linkedin.com/company/135063948/');
  });
});

describe('llms.txt (https://llmstxt.org)', () => {
  const text = read('llms.txt');
  const lines = text.split(/\r?\n/);
  const firstH2 = lines.findIndex((line) => line.startsWith('## '));

  it('starts with the H1 and a blockquote summary', () => {
    expect(lines[0]).toBe('# Seenn');
    const next = lines.slice(1).find((line) => line.trim() !== '');
    expect(next?.startsWith('> ')).toBe(true);
  });

  it('has no headings between the H1 and the first H2 section', () => {
    expect(firstH2).toBeGreaterThan(0);
    for (const line of lines.slice(1, firstH2)) expect(line, line).not.toMatch(/^#{1,6} /);
  });

  it('every H2 section is a file list: each item is a markdown link, optionally with notes', () => {
    const sections = text.slice(text.indexOf('\n## ')).split(/\n(?=## )/).filter((s) => s.trim());
    expect(sections.length).toBeGreaterThanOrEqual(5);
    for (const section of sections) {
      const [heading, ...body] = section.trim().split(/\r?\n/);
      const items = body.filter((line) => line.trim() !== '');
      expect(items.length, heading).toBeGreaterThan(0);
      for (const item of items) expect(item, `${heading}: ${item}`).toMatch(/^- \[[^\]]+\]\([^)\s]+\)(: .+)?$/);
    }
  });

  it('tells agents when to use Seenn, with specific jobs rather than marketing copy', () => {
    const section = text.slice(text.indexOf('## When to use Seenn'), text.indexOf('\n## ', text.indexOf('## When to use Seenn') + 1));
    const items = section.split(/\r?\n/).filter((line) => line.startsWith('- '));
    expect(items.length).toBeGreaterThanOrEqual(5);
    for (const item of items) expect(item).toMatch(/\): the user|\): a business|\): an Israeli business/);
    expect(section).toMatch(/phone|called/i);
    expect(section).toContain('WhatsApp');
    expect(section).toMatch(/Priority, SAP, Hashavshevet or iCount\/Rivhit/);
  });

  it('tells agents how to engage, and that there is no self-serve API', () => {
    expect(text).toContain('## How AI agents should engage');
    expect(text).toContain('(https://www.seenn.ai/contact.html)');
    expect(text).toContain('(https://app.seenn.ai/auth/signup)');
    expect(text).toContain('no self-serve public API, SDK or MCP server');
    expect(text).toContain('`Accept: text/markdown`');
  });

  it('every www.seenn.ai link points at a page that exists', () => {
    const links = [...text.matchAll(/\]\((https:\/\/www\.seenn\.ai[^)\s]*)\)/g)].map((m) => m[1]!);
    expect(links.length).toBeGreaterThan(25);
    for (const link of links) expect(fileForPath(new URL(link).pathname), link).not.toBeNull();
  });

  it('keeps the positioning rules', () => {
    expect(text).not.toMatch(/\bJess\b|receptionist|60%/i);
  });
});

describe('sitemap.xml', () => {
  const xml = new DOMParser().parseFromString(read('sitemap.xml'), 'application/xml');

  it('is well-formed XML', () => {
    expect(xml.getElementsByTagName('parsererror')).toHaveLength(0);
  });

  it('every <loc> is a real page', () => {
    const locs = [...xml.getElementsByTagName('loc')].map((loc) => loc.textContent!.trim());
    expect(locs.length).toBeGreaterThan(30);
    for (const loc of locs) expect(fileForPath(new URL(loc).pathname), loc).not.toBeNull();
  });

  it('lists the developer page with English and x-default alternates', () => {
    const url = [...xml.getElementsByTagName('url')].find(
      (u) => u.getElementsByTagName('loc')[0]!.textContent === `${SITE}/developers.html`,
    )!;
    expect(url).toBeDefined();
    const alternates = [...url.getElementsByTagName('xhtml:link')].map((l) => l.getAttribute('hreflang'));
    expect(alternates).toEqual(['en', 'x-default']);
    expect(url.getElementsByTagName('lastmod')[0]!.textContent).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
