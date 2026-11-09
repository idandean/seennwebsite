// @vitest-environment node
// Server code: no DOM, and node mode lets Vite load ../../api/*.mjs from
// outside this package (the jsdom/web mode refuses files outside the root).

/**
 * Markdown content negotiation for AI agents (GET / with Accept: text/markdown)
 * and agent-friendly 404s.
 *
 * The negotiation vectors are the ones published at
 * https://acceptmarkdown.com/guides/accept-parsing, plus the RFC 9110 edge
 * cases around them. The function suites run twice: against the TypeScript
 * source, and against the committed api/agent-markdown.mjs that Vercel ships,
 * so a stale build cannot pass.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HTML, MARKDOWN, negotiate, parseAccept } from '../src/accept';
import * as source from '../src/api/agent-markdown';

type AgentModule = typeof source;

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const BUILT_PATH = path.join(REPO_ROOT, 'api/agent-markdown.mjs');
// A non-literal specifier keeps TypeScript from resolving the untyped .mjs.
// A plain forward-slash path, not a file:// URL: Vite does not decode the %20
// that "cursor stitch" would become.
const built = (await import(/* @vite-ignore */ BUILT_PATH.split(path.sep).join('/'))) as AgentModule;

const HOME_MD = '# Seenn: AI Accounts Receivable Agent\n\nThe homepage, in Markdown.\n';
const DEV_MD = '# Seenn API and Developer Resources\n\nFor developers.\n';
const HOME_HTML = '<!DOCTYPE html><html><body>home</body></html>';
const DEV_HTML = '<!DOCTYPE html><html><body>developers</body></html>';

/** Stands in for this deployment's static files. Records what was fetched. */
function stubOrigin(overrides: Partial<Record<string, Response | Error>> = {}) {
  const calls: { url: string; accept: string | null }[] = [];
  const files: Record<string, () => Response> = {
    '/index.md': () => new Response(HOME_MD, { headers: { 'content-type': 'text/markdown; charset=utf-8' } }),
    '/developers.md': () => new Response(DEV_MD, { headers: { 'content-type': 'text/markdown; charset=utf-8' } }),
    '/': () => new Response(HOME_HTML, { headers: { 'content-type': 'text/html; charset=utf-8' } }),
    '/developers.html': () => new Response(DEV_HTML, { headers: { 'content-type': 'text/html; charset=utf-8' } }),
  };
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    calls.push({ url: url.href, accept: new Headers(init?.headers).get('accept') });
    const override = overrides[url.pathname];
    if (override instanceof Error) throw override;
    if (override) return override;
    const file = files[url.pathname];
    return file ? file() : new Response('NOT_FOUND', { status: 404 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return { calls, fetchMock };
}

function get(url: string, accept?: string, method = 'GET'): Request {
  const headers = new Headers();
  if (accept !== undefined) headers.set('accept', accept);
  return new Request(url, { method, headers });
}

const HOME = 'https://www.seenn.ai/api/agent-markdown?seenn_page=home';
const DEVELOPERS = 'https://www.seenn.ai/api/agent-markdown?seenn_page=developers';
const MISSING = 'https://www.seenn.ai/api/agent-markdown?seenn_missing=1&path=__ora-404-probe-jurw1r5j';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('negotiate(): acceptmarkdown.com test vectors', () => {
  it.each([
    ['text/markdown', MARKDOWN],
    ['text/markdown, text/html;q=0.8', MARKDOWN],
    ['text/html', HTML],
    ['text/markdown;q=0, text/html', HTML],
    ['*/*', HTML],
  ])('%s -> %s', (accept, expected) => {
    expect(negotiate(accept)).toBe(expected);
  });

  it('a missing Accept header means no constraint: the default, HTML', () => {
    expect(negotiate(null)).toBe(HTML);
    expect(negotiate(undefined)).toBe(HTML);
  });

  it('text/markdown;q=0 alone accepts nothing we produce -> null (406)', () => {
    expect(negotiate('text/markdown;q=0')).toBeNull();
  });
});

describe('negotiate(): q-values, specificity and ties', () => {
  it.each([
    // Higher q wins regardless of order.
    ['text/html;q=0.5, text/markdown;q=0.9', MARKDOWN],
    ['text/markdown;q=0.9, text/html', HTML],
    // Equal q: the more specific range wins.
    ['text/markdown, */*', MARKDOWN],
    ['text/html, text/*', HTML],
    ['text/markdown, text/*', MARKDOWN],
    // Equal q and specificity: the client's own order.
    ['text/markdown, text/html', MARKDOWN],
    ['text/html, text/markdown', HTML],
    ['text/markdown, text/html, */*', MARKDOWN],
    // A wildcard alone states no preference: the default.
    ['text/*', HTML],
    ['*/*;q=0.8', HTML],
    // Browsers.
    ['text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8', HTML],
    // The most specific range decides the q: an exact q=0 beats */*.
    ['text/markdown;q=0, */*', HTML],
    ['text/html;q=0, */*', MARKDOWN],
    // Case-insensitive type names; whitespace tolerated.
    ['TEXT/MARKDOWN', MARKDOWN],
    ['  text/markdown ;  q=1  ,text/html;q=0.1', MARKDOWN],
    // Media-type parameters other than q do not block a match.
    ['text/markdown;variant=GFM', MARKDOWN],
    ['text/markdown;charset="utf-8, really";q=1, text/html;q=0.5', MARKDOWN],
  ])('%s -> %s', (accept, expected) => {
    expect(negotiate(accept)).toBe(expected);
  });

  it.each([
    ['application/json', null],
    ['image/png, application/pdf', null],
    ['text/html;q=0, text/markdown;q=0', null],
    // An empty header is not a missing one: it accepts nothing.
    ['', null],
  ])('%s -> 406', (accept, expected) => {
    expect(negotiate(accept)).toBe(expected);
  });

  it('skips malformed ranges and invalid q-values instead of misreading them', () => {
    expect(parseAccept('text/markdown;q=2, text/html')).toEqual([
      { type: 'text', subtype: 'html', q: 1, index: 0 },
    ]);
    expect(parseAccept('*/markdown, nonsense, text/markdown;q=0.5')).toEqual([
      { type: 'text', subtype: 'markdown', q: 0.5, index: 0 },
    ]);
    expect(negotiate('text/markdown;q=abc, text/html;q=0.5')).toBe(HTML);
  });

  it('picks markdown without naming text/markdown only when HTML is explicitly ranked below a wildcard', () => {
    // The vercel.json pre-filter keys on the literal text/markdown; these are
    // the headers it does not route, and none of them may lose Markdown.
    const withoutMarkdown = [
      '*/*', 'text/*', 'text/html', 'text/plain', 'text/html, text/*;q=0.5',
      'application/json, */*;q=0.1', 'text/x-markdown', 'application/markdown',
      'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    ];
    for (const accept of withoutMarkdown) expect(negotiate(accept), accept).not.toBe(MARKDOWN);
    // The documented exception (see src/accept.ts): served static HTML.
    expect(negotiate('text/html;q=0, */*')).toBe(MARKDOWN);
    expect(negotiate('text/*;q=1, text/html;q=0.1')).toBe(MARKDOWN);
  });
});

describe.each([
  ['source', source],
  ['built api/agent-markdown.mjs', built],
])('agent-markdown function (%s)', (_label, mod) => {
  const run = (request: Request) => mod.default(request) as Promise<Response>;

  describe('homepage negotiation', () => {
    it('Accept: text/markdown -> 200 Markdown with Vary: Accept', async () => {
      const { calls } = stubOrigin();
      const response = await run(get(HOME, 'text/markdown'));

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
      expect(response.headers.get('vary')).toBe('Accept');
      expect(response.headers.get('link')).toBe('<https://www.seenn.ai/>; rel="canonical"');
      expect(await response.text()).toBe(HOME_MD);
      // Served from the static twin on this same deployment.
      expect(calls).toEqual([{ url: 'https://www.seenn.ai/index.md', accept: 'text/markdown' }]);
    });

    it('declares a Content-Length that matches the UTF-8 body', async () => {
      stubOrigin({ '/index.md': new Response('# שירה\n') });
      const response = await run(get(HOME, 'text/markdown'));
      const bytes = new Uint8Array(await response.arrayBuffer());
      expect(response.headers.get('content-length')).toBe(String(bytes.byteLength));
    });

    it('a header that names markdown but prefers HTML gets the HTML page', async () => {
      const { calls } = stubOrigin();
      const response = await run(get(HOME, 'text/html, text/markdown;q=0.5'));

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');
      expect(response.headers.get('vary')).toBe('Accept');
      expect(response.headers.get('link')).toBe('</index.md>; rel="alternate"; type="text/markdown"');
      expect(await response.text()).toBe(HOME_HTML);
      // The subrequest asks for HTML, so it cannot be routed back here.
      expect(calls).toEqual([{ url: 'https://www.seenn.ai/', accept: 'text/html' }]);
    });

    it('text/markdown;q=0 with no HTML -> 406 listing both representations, never cached', async () => {
      const { fetchMock } = stubOrigin();
      const response = await run(get(HOME, 'text/markdown;q=0'));

      expect(response.status).toBe(406);
      expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8');
      expect(response.headers.get('vary')).toBe('Accept');
      expect(response.headers.get('cache-control')).toBe('no-store');
      const body = await response.text();
      expect(body).toContain('text/html');
      expect(body).toContain('text/markdown');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('HEAD returns the Markdown headers and no body', async () => {
      stubOrigin();
      const response = await run(get(HOME, 'text/markdown', 'HEAD'));

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
      expect(response.headers.get('vary')).toBe('Accept');
      expect(response.headers.get('content-length')).toBe(String(new TextEncoder().encode(HOME_MD).byteLength));
      expect(response.body).toBeNull();
    });

    it('serves the developers page twin for seenn_page=developers', async () => {
      const { calls } = stubOrigin();
      const response = await run(get(DEVELOPERS, 'text/markdown'));

      expect(response.status).toBe(200);
      expect(await response.text()).toBe(DEV_MD);
      expect(response.headers.get('link')).toBe('<https://www.seenn.ai/developers.html>; rel="canonical"');
      expect(calls[0]?.url).toBe('https://www.seenn.ai/developers.md');
    });

    it('also resolves the page when invoked with the original path instead of the destination', async () => {
      stubOrigin();
      const home = await run(get('https://www.seenn.ai/', 'text/markdown'));
      expect(await home.text()).toBe(HOME_MD);
      const dev = await run(get('https://www.seenn.ai/developers.html', 'text/markdown'));
      expect(await dev.text()).toBe(DEV_MD);
    });

    it('falls back to the HTML page when the Markdown twin is unreachable', async () => {
      stubOrigin({ '/index.md': new Error('network down') });
      const response = await run(get(HOME, 'text/markdown'));
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');
      expect(await response.text()).toBe(HOME_HTML);
    });

    it('treats an empty Markdown twin as unreachable', async () => {
      stubOrigin({ '/index.md': new Response('  \n') });
      const response = await run(get(HOME, 'text/markdown'));
      expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');
    });

    it('answers 502 only when both representations are unreachable', async () => {
      stubOrigin({ '/index.md': new Error('down'), '/': new Response('', { status: 500 }) });
      const response = await run(get(HOME, 'text/markdown'));
      expect(response.status).toBe(502);
    });

    it('rejects methods other than GET and HEAD with 405', async () => {
      stubOrigin();
      const response = await run(get(HOME, 'text/markdown', 'POST'));
      expect(response.status).toBe(405);
      expect(response.headers.get('allow')).toBe('GET, HEAD');
    });
  });

  describe('agent-friendly 404', () => {
    it('Accept: text/markdown -> 404 with a Markdown body that points to llms.txt, the sitemap and docs', async () => {
      const { fetchMock } = stubOrigin();
      const response = await run(get(MISSING, 'text/markdown'));

      expect(response.status).toBe(404);
      expect(response.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
      expect(response.headers.get('vary')).toBe('Accept');
      const body = await response.text();
      expect(body.length).toBeGreaterThanOrEqual(20);
      expect(body).toMatch(/^# Page not found/);
      expect(body).toContain('(https://www.seenn.ai/llms.txt)');
      expect(body).toContain('(https://www.seenn.ai/sitemap.xml)');
      expect(body).toContain('(https://www.seenn.ai/developers.html)');
      // Nothing to fetch for a page that does not exist.
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('a client that prefers HTML still gets a 404, as plain text', async () => {
      stubOrigin();
      const response = await run(get(MISSING, 'text/html, text/markdown;q=0.1'));
      expect(response.status).toBe(404);
      expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    });

    it('a 404 stays a 404 for every method, and HEAD has no body', async () => {
      stubOrigin();
      for (const method of ['GET', 'HEAD', 'POST']) {
        const response = await run(get(MISSING, 'text/markdown', method));
        expect(response.status, method).toBe(404);
      }
      expect((await run(get(MISSING, 'text/markdown', 'HEAD'))).body).toBeNull();
    });

    it('a client-appended seenn_page cannot turn a missing path into a page', async () => {
      stubOrigin();
      const spoofed = `${MISSING}&seenn_page=home`;
      expect((await run(get(spoofed, 'text/markdown'))).status).toBe(404);
      // Invoked with the original path, an unknown path is a 404 whatever the query says.
      const original = 'https://www.seenn.ai/__missing?seenn_page=home';
      expect((await run(get(original, 'text/markdown'))).status).toBe(404);
    });

    it('conflicting, unknown or prototype page names are 404s, not guesses', async () => {
      stubOrigin();
      for (const query of [
        'seenn_page=home&seenn_page=developers',
        'seenn_page=constructor',
        'seenn_page=__proto__',
        'seenn_page=nope',
        '',
      ]) {
        const response = await run(get(`https://www.seenn.ai/api/agent-markdown?${query}`, 'text/markdown'));
        expect(response.status, query).toBe(404);
      }
    });
  });

  describe('origin safety', () => {
    it.each([
      ['https://www.seenn.ai/x', 'https://www.seenn.ai'],
      ['https://seenn.ai/x', 'https://seenn.ai'],
      ['https://seennwebsite-abc123-team.vercel.app/x', 'https://seennwebsite-abc123-team.vercel.app'],
      ['http://localhost:3000/x', 'http://localhost:3000'],
      ['https://evil.example/x', 'https://www.seenn.ai'],
      ['https://www.seenn.ai.evil.example/x', 'https://www.seenn.ai'],
      ['https://other.vercel.app/x', 'https://www.seenn.ai'],
    ])('%s fetches from %s', (url, origin) => {
      expect(mod.trustedOrigin(url)).toBe(origin);
    });

    it('a forged Host never redirects the subrequest off-site', async () => {
      const { calls } = stubOrigin();
      await run(get('https://evil.example/api/agent-markdown?seenn_page=home', 'text/markdown'));
      expect(calls[0]?.url).toBe('https://www.seenn.ai/index.md');
    });
  });

  describe('Node (req, res) invocation, which is how Vercel runs .mjs functions', () => {
    function nodeCall(url: string, headers: Record<string, string>, method = 'GET') {
      const sent = { status: 0, headers: {} as Record<string, string>, body: undefined as Uint8Array | undefined, ended: false };
      const res = {
        set statusCode(value: number) { sent.status = value; },
        get statusCode() { return sent.status; },
        setHeader(name: string, value: string) { sent.headers[name.toLowerCase()] = value; },
        end(payload?: Uint8Array) { sent.body = payload; sent.ended = true; },
      };
      return { promise: mod.default({ method, url, headers }, res), sent };
    }

    it('writes the Markdown response through res', async () => {
      stubOrigin();
      const { promise, sent } = nodeCall('/api/agent-markdown?seenn_page=home', {
        host: 'www.seenn.ai',
        accept: 'text/markdown',
      });
      await promise;

      expect(sent.ended).toBe(true);
      expect(sent.status).toBe(200);
      expect(sent.headers['content-type']).toBe('text/markdown; charset=utf-8');
      expect(sent.headers['vary']).toBe('Accept');
      expect(new TextDecoder().decode(sent.body)).toBe(HOME_MD);
    });

    it('writes the Markdown 404 through res', async () => {
      stubOrigin();
      const { promise, sent } = nodeCall('/api/agent-markdown?seenn_missing=1', {
        host: 'www.seenn.ai',
        accept: 'text/markdown',
      });
      await promise;
      expect(sent.status).toBe(404);
      expect(new TextDecoder().decode(sent.body)).toContain('llms.txt');
    });

    it('HEAD through res ends with no body', async () => {
      stubOrigin();
      const { promise, sent } = nodeCall('/api/agent-markdown?seenn_page=home', {
        host: 'www.seenn.ai',
        accept: 'text/markdown',
      }, 'HEAD');
      await promise;
      expect(sent.status).toBe(200);
      expect(sent.body).toBeUndefined();
    });

    it('uses the routed Host, never x-forwarded-host, and still vets it', async () => {
      const { calls } = stubOrigin();
      await nodeCall('/api/agent-markdown?seenn_page=home', {
        host: 'evil.example',
        'x-forwarded-host': 'www.seenn.ai',
        accept: 'text/markdown',
      }).promise;
      expect(calls[0]?.url).toBe('https://www.seenn.ai/index.md');
    });
  });
});

describe('the committed build', () => {
  it('is the generated artefact, not a hand edit', () => {
    const text = readFileSync(BUILT_PATH, 'utf8');
    expect(text.startsWith('/**\n * GENERATED FILE — DO NOT EDIT.') || text.startsWith('/**\r\n * GENERATED FILE — DO NOT EDIT.')).toBe(true);
    expect(text).toContain('// src/accept.ts');
    expect(text).toContain('// src/api/agent-markdown.ts');
  });
});
