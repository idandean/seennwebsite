/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Built from tools/voice-demo/src/api/agent-markdown.ts by
 * tools/voice-demo/scripts/build.mjs. Edit the TypeScript source and re-run
 * `npm run build` in tools/voice-demo.
 *
 * vercel.json sends a request here only when its Accept header names
 * text/markdown. The Markdown itself is the static /index.md and
 * /developers.md, fetched at request time, so editing those needs no rebuild.
 */

// src/accept.ts
var HTML = "text/html";
var MARKDOWN = "text/markdown";
var TOKEN = /^[!#$%&'*+.^_`|~0-9a-z-]+$/;
var QVALUE = /^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/;
function splitOutsideQuotes(input, separator) {
  const parts = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < input.length; i += 1) {
    const char = input.charAt(i);
    if (quoted && char === "\\" && i + 1 < input.length) {
      current += char + input.charAt(i + 1);
      i += 1;
      continue;
    }
    if (char === '"') quoted = !quoted;
    if (char === separator && !quoted) {
      parts.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  parts.push(current);
  return parts;
}
function parseAccept(header) {
  const ranges = [];
  splitOutsideQuotes(header, ",").forEach((entry) => {
    const [mediaType = "", ...params] = splitOutsideQuotes(entry, ";").map((part) => part.trim());
    const [type = "", subtype = "", extra] = mediaType.toLowerCase().split("/");
    if (extra !== void 0 || !TOKEN.test(type) || !TOKEN.test(subtype)) return;
    if (type === "*" && subtype !== "*") return;
    let q = 1;
    for (const param of params) {
      const eq = param.indexOf("=");
      if (eq === -1) continue;
      if (param.slice(0, eq).trim().toLowerCase() !== "q") continue;
      const value = param.slice(eq + 1).trim();
      if (!QVALUE.test(value)) return;
      q = Number(value);
      break;
    }
    ranges.push({ type, subtype, q, index: ranges.length });
  });
  return ranges;
}
function bestMatch(ranges, representation) {
  const [type, subtype] = representation.split("/");
  let best = null;
  for (const range of ranges) {
    let specificity;
    if (range.type === type && range.subtype === subtype) specificity = 2;
    else if (range.type === type && range.subtype === "*") specificity = 1;
    else if (range.type === "*" && range.subtype === "*") specificity = 0;
    else continue;
    if (best === null || specificity > best.specificity || specificity === best.specificity && range.q > best.q) {
      best = { q: range.q, specificity, index: range.index };
    }
  }
  return best;
}
function negotiate(acceptHeader) {
  if (acceptHeader === null || acceptHeader === void 0) return HTML;
  const ranges = parseAccept(acceptHeader);
  const html = bestMatch(ranges, HTML);
  const markdown = bestMatch(ranges, MARKDOWN);
  const htmlQ = html?.q ?? 0;
  const markdownQ = markdown?.q ?? 0;
  if (htmlQ === 0 && markdownQ === 0) return null;
  if (markdownQ !== htmlQ) return markdownQ > htmlQ ? MARKDOWN : HTML;
  const h = html;
  const m = markdown;
  if (m.specificity !== h.specificity) return m.specificity > h.specificity ? MARKDOWN : HTML;
  if (m.index === h.index) return HTML;
  return m.index < h.index ? MARKDOWN : HTML;
}

// src/api/agent-markdown.ts
var SITE = "https://www.seenn.ai";
var PAGES = {
  home: { markdownPath: "/index.md", htmlPath: "/", canonical: `${SITE}/` },
  developers: {
    markdownPath: "/developers.md",
    htmlPath: "/developers.html",
    canonical: `${SITE}/developers.html`
  }
};
var MARKDOWN_TYPE = "text/markdown; charset=utf-8";
var HTML_TYPE = "text/html; charset=utf-8";
var PLAIN_TYPE = "text/plain; charset=utf-8";
var CACHE_CONTROL = "public, max-age=0, must-revalidate";
var UPSTREAM_TIMEOUT_MS = 5e3;
var NOT_FOUND_MARKDOWN = `# Page not found (404)

There is no page at this address on seenn.ai. The link may be out of date, or the address may contain a typo.

Seenn is an AI accounts-receivable agent: its agent, Shira, phones, WhatsApps and emails overdue clients and collects the payment.

## Where to go instead

- [Seenn homepage](${SITE}/): what Seenn is and how Shira collects (send \`Accept: text/markdown\` for Markdown)
- [llms.txt](${SITE}/llms.txt): when to use Seenn, how to engage, and every key page
- [Developer and API resources](${SITE}/developers.html): integrations, API access and machine-readable files
- [Sitemap](${SITE}/sitemap.xml): every page on the site
- [Contact](${SITE}/contact.html): or email hello@seenn.ai
`;
var NOT_FOUND_PLAIN = "The page could not be found.\n\nNOT_FOUND\n";
function headers(contentType, extra = {}) {
  return new Headers({
    "Content-Type": contentType,
    Vary: "Accept",
    "Cache-Control": CACHE_CONTROL,
    "X-Content-Type-Options": "nosniff",
    ...extra
  });
}
function respond(request, body, status, responseHeaders) {
  responseHeaders.set("Content-Length", String(new TextEncoder().encode(body).byteLength));
  return new Response(request.method === "HEAD" ? null : body, { status, headers: responseHeaders });
}
function notFound(request) {
  if (negotiate(request.headers.get("accept")) === MARKDOWN) {
    return respond(request, NOT_FOUND_MARKDOWN, 404, headers(MARKDOWN_TYPE));
  }
  return respond(request, NOT_FOUND_PLAIN, 404, headers(PLAIN_TYPE));
}
function notAcceptable(request) {
  const asked = (request.headers.get("accept") ?? "").replace(/[^\x20-\x7e]/g, "").slice(0, 200);
  const body = `406 Not Acceptable

This page is available as:
  ${HTML}
  ${MARKDOWN}

Your Accept header (${asked}) accepts neither. Retry with "Accept: ${MARKDOWN}" or "Accept: ${HTML}".
`;
  const responseHeaders = headers(PLAIN_TYPE);
  responseHeaders.set("Cache-Control", "no-store");
  return respond(request, body, 406, responseHeaders);
}
async function fetchText(origin, path, accept) {
  try {
    const response = await fetch(new URL(path, origin), {
      headers: { accept },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}
function trustedOrigin(requestUrl) {
  const url = new URL(requestUrl);
  const host = url.hostname.toLowerCase();
  const ours = host === "www.seenn.ai" || host === "seenn.ai" || // Preview deployments: seennwebsite-<hash>-<team>.vercel.app, seennwebsite-git-<branch>-…
  host.startsWith("seennwebsite") && host.endsWith(".vercel.app") || host === "localhost" || host === "127.0.0.1";
  return ours ? url.origin : SITE;
}
async function servePage(request, page) {
  const chosen = negotiate(request.headers.get("accept"));
  if (chosen === null) return notAcceptable(request);
  const origin = trustedOrigin(request.url);
  if (chosen === MARKDOWN) {
    const markdown = await fetchText(origin, page.markdownPath, MARKDOWN);
    if (markdown !== null && markdown.trim() !== "") {
      return respond(
        request,
        markdown,
        200,
        headers(MARKDOWN_TYPE, { Link: `<${page.canonical}>; rel="canonical"` })
      );
    }
  }
  const html = await fetchText(origin, page.htmlPath, HTML);
  if (html === null) {
    return respond(request, "The page is temporarily unavailable.\n", 502, headers(PLAIN_TYPE));
  }
  return respond(
    request,
    html,
    200,
    headers(HTML_TYPE, { Link: `<${page.markdownPath}>; rel="alternate"; type="${MARKDOWN}"` })
  );
}
var FUNCTION_PATHS = /* @__PURE__ */ new Set(["/api/agent-markdown", "/api/agent-markdown.mjs"]);
function resolvePage(requestUrl) {
  const url = new URL(requestUrl);
  const params = url.searchParams;
  if (params.has("seenn_missing")) return null;
  let key = "";
  if (FUNCTION_PATHS.has(url.pathname)) {
    const requested = [...new Set(params.getAll("seenn_page"))];
    if (requested.length === 1) key = requested[0];
  } else {
    for (const [name, page] of Object.entries(PAGES)) {
      if (page.htmlPath === url.pathname) key = name;
    }
  }
  return Object.prototype.hasOwnProperty.call(PAGES, key) ? PAGES[key] ?? null : null;
}
async function handle(request) {
  const page = resolvePage(request.url);
  if (page === null) return notFound(request);
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(null, {
      status: 405,
      headers: { Allow: "GET, HEAD", Vary: "Accept", "Cache-Control": "no-store" }
    });
  }
  return servePage(request, page);
}
function isWebRequest(value) {
  return typeof value?.headers?.get === "function";
}
function toWebRequest(req) {
  const headers2 = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (value === void 0) continue;
    headers2.set(name, Array.isArray(value) ? value.join(", ") : value);
  }
  const host = headers2.get("host") ?? "www.seenn.ai";
  const path = req.url ?? "/";
  return new Request(`https://${host}${path.startsWith("/") ? path : `/${path}`}`, {
    method: req.method ?? "GET",
    headers: headers2
  });
}
async function writeNode(response, res) {
  res.statusCode = response.status;
  response.headers.forEach((value, name) => res.setHeader(name, value));
  if (response.body === null) {
    res.end();
    return;
  }
  res.end(new Uint8Array(await response.arrayBuffer()));
}
async function handler(request, response) {
  if (isWebRequest(request)) return handle(request);
  let result;
  try {
    result = await handle(toWebRequest(request));
  } catch {
    result = new Response("Internal error.\n", {
      status: 500,
      headers: { "Content-Type": PLAIN_TYPE, "Cache-Control": "no-store" }
    });
  }
  if (response) await writeNode(result, response);
}
export {
  MARKDOWN_TYPE,
  NOT_FOUND_MARKDOWN,
  PAGES,
  SITE,
  handler as default,
  handle,
  resolvePage,
  toWebRequest,
  trustedOrigin
};
