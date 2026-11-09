/**
 * The same-origin Vercel Edge Function behind Markdown content negotiation.
 *
 * Browsers never reach it. vercel.json sends a request here only when its
 * Accept header names `text/markdown`, which is how every client that wants
 * Markdown asks for it (see ../accept.ts for the one theoretical exception).
 * Everyone else gets the static HTML exactly as before, straight from the CDN.
 *
 * Two ways in, both set by vercel.json:
 *
 *   ?seenn_page=home|developers  a `routes` entry for a page that has a
 *                                Markdown twin. Negotiate, then serve the
 *                                Markdown (or, rarely, the HTML).
 *   ?seenn_missing=1             a `rewrites` entry. Vercel applies rewrites
 *                                only after the filesystem misses, so this is
 *                                always a path that does not exist: answer 404
 *                                with a Markdown body that points agents
 *                                somewhere useful.
 *
 * The Markdown itself lives in static files (/index.md, /developers.md) and is
 * fetched from this deployment, so editing a .md file never needs a rebuild.
 *
 * Runtime: Vercel builds this .mjs as a Node.js function (`vercel build` emits
 * `runtime: nodejs22.x`, `launcherType: Nodejs` — an `edge` marker would be
 * ignored, exactly as it is for api/voice-demo-language.mjs). The Node launcher
 * calls a default export as (req, res), so the default export accepts both
 * that and a Web `Request`; the logic itself is Web-standard.
 */

import { HTML, MARKDOWN, negotiate } from '../accept';

export const SITE = 'https://www.seenn.ai';

export interface Page {
  /** The static Markdown twin, fetched from this deployment. */
  markdownPath: string;
  /** The HTML page, fetched only when HTML wins negotiation. */
  htmlPath: string;
  canonical: string;
}

export const PAGES: Readonly<Record<string, Page>> = {
  home: { markdownPath: '/index.md', htmlPath: '/', canonical: `${SITE}/` },
  developers: {
    markdownPath: '/developers.md',
    htmlPath: '/developers.html',
    canonical: `${SITE}/developers.html`,
  },
};

export const MARKDOWN_TYPE = 'text/markdown; charset=utf-8';
const HTML_TYPE = 'text/html; charset=utf-8';
const PLAIN_TYPE = 'text/plain; charset=utf-8';

// Matches the static HTML responses, which revalidate on every request.
const CACHE_CONTROL = 'public, max-age=0, must-revalidate';
const UPSTREAM_TIMEOUT_MS = 5000;

export const NOT_FOUND_MARKDOWN = `# Page not found (404)

There is no page at this address on seenn.ai. The link may be out of date, or the address may contain a typo.

Seenn is an AI accounts-receivable agent: its agent, Shira, phones, WhatsApps and emails overdue clients and collects the payment.

## Where to go instead

- [Seenn homepage](${SITE}/): what Seenn is and how Shira collects (send \`Accept: text/markdown\` for Markdown)
- [llms.txt](${SITE}/llms.txt): when to use Seenn, how to engage, and every key page
- [Developer and API resources](${SITE}/developers.html): integrations, API access and machine-readable files
- [Sitemap](${SITE}/sitemap.xml): every page on the site
- [Contact](${SITE}/contact.html): or email hello@seenn.ai
`;

// Mirrors the wording of Vercel's own 404 for clients that prefer HTML.
const NOT_FOUND_PLAIN = 'The page could not be found.\n\nNOT_FOUND\n';

function headers(contentType: string, extra: Record<string, string> = {}): Headers {
  return new Headers({
    'Content-Type': contentType,
    Vary: 'Accept',
    'Cache-Control': CACHE_CONTROL,
    'X-Content-Type-Options': 'nosniff',
    ...extra,
  });
}

function respond(
  request: Request,
  body: string,
  status: number,
  responseHeaders: Headers,
): Response {
  responseHeaders.set('Content-Length', String(new TextEncoder().encode(body).byteLength));
  return new Response(request.method === 'HEAD' ? null : body, { status, headers: responseHeaders });
}

function notFound(request: Request): Response {
  // A 404 is about the resource, not the representation, so there is no 406
  // here: anyone who did not ask for Markdown first gets the plain text 404.
  if (negotiate(request.headers.get('accept')) === MARKDOWN) {
    return respond(request, NOT_FOUND_MARKDOWN, 404, headers(MARKDOWN_TYPE));
  }
  return respond(request, NOT_FOUND_PLAIN, 404, headers(PLAIN_TYPE));
}

function notAcceptable(request: Request): Response {
  const asked = (request.headers.get('accept') ?? '').replace(/[^\x20-\x7e]/g, '').slice(0, 200);
  const body =
    '406 Not Acceptable\n\n' +
    'This page is available as:\n' +
    `  ${HTML}\n` +
    `  ${MARKDOWN}\n\n` +
    `Your Accept header (${asked}) accepts neither. ` +
    `Retry with "Accept: ${MARKDOWN}" or "Accept: ${HTML}".\n`;
  const responseHeaders = headers(PLAIN_TYPE);
  // RFC 9110 §15.5.7 / acceptmarkdown.com: never cache a 406 aggressively.
  responseHeaders.set('Cache-Control', 'no-store');
  return respond(request, body, 406, responseHeaders);
}

async function fetchText(origin: string, path: string, accept: string): Promise<string | null> {
  try {
    const response = await fetch(new URL(path, origin), {
      headers: { accept },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

/**
 * The origin to fetch the static twins from. The routed host is trusted only
 * if it is one of ours; anything else falls back to the production site, so a
 * forged Host can never make this function fetch and re-serve another site.
 */
export function trustedOrigin(requestUrl: string): string {
  const url = new URL(requestUrl);
  const host = url.hostname.toLowerCase();
  const ours =
    host === 'www.seenn.ai' ||
    host === 'seenn.ai' ||
    // Preview deployments: seennwebsite-<hash>-<team>.vercel.app, seennwebsite-git-<branch>-…
    (host.startsWith('seennwebsite') && host.endsWith('.vercel.app')) ||
    host === 'localhost' ||
    host === '127.0.0.1';
  return ours ? url.origin : SITE;
}

async function servePage(request: Request, page: Page): Promise<Response> {
  const chosen = negotiate(request.headers.get('accept'));
  if (chosen === null) return notAcceptable(request);

  const origin = trustedOrigin(request.url);

  if (chosen === MARKDOWN) {
    const markdown = await fetchText(origin, page.markdownPath, MARKDOWN);
    if (markdown !== null && markdown.trim() !== '') {
      return respond(
        request,
        markdown,
        200,
        headers(MARKDOWN_TYPE, { Link: `<${page.canonical}>; rel="canonical"` }),
      );
    }
    // The twin is unreachable: degrade to the page itself rather than erroring.
  }

  // The subrequest asks for HTML, so vercel.json serves it statically and it
  // cannot loop back here.
  const html = await fetchText(origin, page.htmlPath, HTML);
  if (html === null) {
    return respond(request, 'The page is temporarily unavailable.\n', 502, headers(PLAIN_TYPE));
  }
  return respond(
    request,
    html,
    200,
    headers(HTML_TYPE, { Link: `<${page.markdownPath}>; rel="alternate"; type="${MARKDOWN}"` }),
  );
}

const FUNCTION_PATHS = new Set(['/api/agent-markdown', '/api/agent-markdown.mjs']);

/**
 * Which page this request is for, or null for "answer 404".
 *
 * Vercel may invoke the function with the destination URL
 * (/api/agent-markdown?seenn_page=home) or with the original path (/), as it
 * does for Express-style catch-all rewrites. Both are handled, so the answer
 * never depends on which one this platform version uses.
 */
export function resolvePage(requestUrl: string): Page | null {
  const url = new URL(requestUrl);
  const params = url.searchParams;
  // Set by the 404 rewrite, which only runs after the filesystem has missed.
  if (params.has('seenn_missing')) return null;

  let key = '';
  if (FUNCTION_PATHS.has(url.pathname)) {
    // vercel.json sets exactly one value. A client can append its own query
    // string, so a conflicting value means "no such page" rather than a guess:
    // only the client that crafted it is affected.
    const requested = [...new Set(params.getAll('seenn_page'))];
    if (requested.length === 1) key = requested[0] as string;
  } else {
    for (const [name, page] of Object.entries(PAGES)) {
      if (page.htmlPath === url.pathname) key = name;
    }
  }
  // Own keys only: `?seenn_page=constructor` must not resolve to Object.prototype.
  return Object.prototype.hasOwnProperty.call(PAGES, key) ? (PAGES[key] ?? null) : null;
}

export async function handle(request: Request): Promise<Response> {
  const page = resolvePage(request.url);
  if (page === null) return notFound(request);

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response(null, {
      status: 405,
      headers: { Allow: 'GET, HEAD', Vary: 'Accept', 'Cache-Control': 'no-store' },
    });
  }
  return servePage(request, page);
}

/** The subset of Node's IncomingMessage the adapter reads. */
export interface NodeRequest {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
}

/** The subset of Node's ServerResponse the adapter writes. */
export interface NodeResponse {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(body?: Uint8Array): void;
}

function isWebRequest(value: unknown): value is Request {
  return typeof (value as { headers?: { get?: unknown } } | null)?.headers?.get === 'function';
}

/**
 * Rebuilds a Web Request from Node's (req, res) invocation. The URL's host is
 * the routed `Host` header (never `x-forwarded-host`); trustedOrigin() still
 * vets it before anything is fetched.
 */
export function toWebRequest(req: NodeRequest): Request {
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    headers.set(name, Array.isArray(value) ? value.join(', ') : value);
  }
  const host = headers.get('host') ?? 'www.seenn.ai';
  const path = req.url ?? '/';
  return new Request(`https://${host}${path.startsWith('/') ? path : `/${path}`}`, {
    method: req.method ?? 'GET',
    headers,
  });
}

async function writeNode(response: Response, res: NodeResponse): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach((value, name) => res.setHeader(name, value));
  if (response.body === null) {
    res.end();
    return;
  }
  res.end(new Uint8Array(await response.arrayBuffer()));
}

export default async function handler(
  request: Request | NodeRequest,
  response?: NodeResponse,
): Promise<Response | void> {
  if (isWebRequest(request)) return handle(request);
  let result: Response;
  try {
    result = await handle(toWebRequest(request));
  } catch {
    result = new Response('Internal error.\n', {
      status: 500,
      headers: { 'Content-Type': PLAIN_TYPE, 'Cache-Control': 'no-store' },
    });
  }
  if (response) await writeNode(result, response);
}
