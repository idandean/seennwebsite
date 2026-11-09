/**
 * HTTP content negotiation between the two representations the site can
 * produce for a page: HTML (the default) and Markdown.
 *
 * This follows RFC 9110 §12.5.1 and the algorithm published at
 * https://acceptmarkdown.com/guides/accept-parsing:
 *
 *   for each type we can produce
 *     find the best-matching Accept entry (exact > type/* > *\/*)
 *     its score is that entry's q (0 if nothing matches, or the match has q=0)
 *   pick the type with the highest score; if every score is 0 -> 406
 *
 * Ties are broken by specificity (`text/markdown` beats `*\/*`), then by the
 * order the client listed the types in, and finally in favour of HTML, so
 * `*\/*` and `text/*` keep serving the default.
 *
 * Markdown therefore wins only when the client names `text/markdown`, or when
 * it explicitly ranks `text/html` below a wildcard that admits Markdown
 * (`text/html;q=0, *\/*` or `text/*, text/html;q=0.1`). vercel.json sends only
 * the first case to code. The second, which no known client sends, keeps
 * getting the static HTML: RFC 9110 §12.5.1 lets a server disregard Accept
 * rather than honour it.
 *
 * Deliberately not a substring match: `text/markdown;q=0` is a refusal.
 */

export const HTML = 'text/html';
export const MARKDOWN = 'text/markdown';

export type Representation = typeof HTML | typeof MARKDOWN;

export interface MediaRange {
  type: string;
  subtype: string;
  q: number;
  /** Position in the header, used only to break exact ties. */
  index: number;
}

interface Match {
  q: number;
  /** 2 = exact type, 1 = type/*, 0 = *\/*. */
  specificity: number;
  index: number;
}

const TOKEN = /^[!#$%&'*+.^_`|~0-9a-z-]+$/;
// RFC 9110 §12.4.2: qvalue = ( "0" [ "." 0*3DIGIT ] ) / ( "1" [ "." 0*3("0") ] )
const QVALUE = /^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/;

/** Splits on commas and semicolons that are not inside a quoted string. */
function splitOutsideQuotes(input: string, separator: ',' | ';'): string[] {
  const parts: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < input.length; i += 1) {
    const char = input.charAt(i);
    if (quoted && char === '\\' && i + 1 < input.length) {
      current += char + input.charAt(i + 1);
      i += 1;
      continue;
    }
    if (char === '"') quoted = !quoted;
    if (char === separator && !quoted) {
      parts.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  parts.push(current);
  return parts;
}

/**
 * Parses an Accept header into media ranges. Malformed entries are skipped
 * rather than failing the whole header, so one bad range from a client does
 * not change how the rest of its preferences are read.
 */
export function parseAccept(header: string): MediaRange[] {
  const ranges: MediaRange[] = [];
  splitOutsideQuotes(header, ',').forEach((entry) => {
    const [mediaType = '', ...params] = splitOutsideQuotes(entry, ';').map((part) => part.trim());
    const [type = '', subtype = '', extra] = mediaType.toLowerCase().split('/');
    if (extra !== undefined || !TOKEN.test(type) || !TOKEN.test(subtype)) return;
    if (type === '*' && subtype !== '*') return;

    let q = 1;
    for (const param of params) {
      const eq = param.indexOf('=');
      if (eq === -1) continue;
      if (param.slice(0, eq).trim().toLowerCase() !== 'q') continue;
      const value = param.slice(eq + 1).trim();
      if (!QVALUE.test(value)) return;
      q = Number(value);
      // Anything after q is an accept-extension, not a media-type parameter.
      break;
    }

    ranges.push({ type, subtype, q, index: ranges.length });
  });
  return ranges;
}

function bestMatch(ranges: readonly MediaRange[], representation: Representation): Match | null {
  const [type, subtype] = representation.split('/') as [string, string];
  let best: Match | null = null;
  for (const range of ranges) {
    let specificity: number;
    if (range.type === type && range.subtype === subtype) specificity = 2;
    else if (range.type === type && range.subtype === '*') specificity = 1;
    else if (range.type === '*' && range.subtype === '*') specificity = 0;
    else continue;

    // The most specific matching range decides the q (RFC 9110 §12.5.1).
    if (
      best === null ||
      specificity > best.specificity ||
      (specificity === best.specificity && range.q > best.q)
    ) {
      best = { q: range.q, specificity, index: range.index };
    }
  }
  return best;
}

/**
 * Chooses the representation to send, or `null` when the client accepts
 * neither (the caller answers 406). A missing header means "no preference" and
 * gets the default, HTML.
 */
export function negotiate(acceptHeader: string | null | undefined): Representation | null {
  if (acceptHeader === null || acceptHeader === undefined) return HTML;
  const ranges = parseAccept(acceptHeader);

  const html = bestMatch(ranges, HTML);
  const markdown = bestMatch(ranges, MARKDOWN);
  const htmlQ = html?.q ?? 0;
  const markdownQ = markdown?.q ?? 0;

  if (htmlQ === 0 && markdownQ === 0) return null;
  if (markdownQ !== htmlQ) return markdownQ > htmlQ ? MARKDOWN : HTML;

  // Equal, non-zero q: both matched something.
  const h = html as Match;
  const m = markdown as Match;
  if (m.specificity !== h.specificity) return m.specificity > h.specificity ? MARKDOWN : HTML;
  // Same wildcard entry (`*/*` or `text/*`): no stated preference, so the default.
  if (m.index === h.index) return HTML;
  return m.index < h.index ? MARKDOWN : HTML;
}
