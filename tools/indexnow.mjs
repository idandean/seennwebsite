#!/usr/bin/env node
// Tell IndexNow search engines (Bing, Yandex, Seznam, Naver; Bing feeds ChatGPT search
// and Copilot) that pages changed, so they recrawl now instead of on their own schedule.
//
// Run AFTER the deploy is live (the key file must be reachable):
//   node tools/indexnow.mjs https://www.seenn.ai/he/ https://www.seenn.ai/blog/x.html
//   node tools/indexnow.mjs --sitemap            # every URL in sitemap.xml
//   node tools/indexnow.mjs --since 2026-11-20   # sitemap URLs with <lastmod> on or after that date
//
// The key is the file name of the *.txt at the site root whose content equals its own name.
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const HOST = 'www.seenn.ai';

const key = readdirSync(root)
  .filter((f) => /^[0-9a-f]{32}\.txt$/.test(f))
  .map((f) => f.slice(0, -4))
  .find((k) => readFileSync(join(root, `${k}.txt`), 'utf8').trim() === k);
if (!key) throw new Error('No IndexNow key file (<32 hex>.txt containing its own name) at the site root.');

const args = process.argv.slice(2);
let urls = args.filter((a) => a.startsWith('https://'));
if (args.includes('--sitemap') || args.includes('--since')) {
  const since = args.includes('--since') ? args[args.indexOf('--since') + 1] : '';
  const xml = readFileSync(join(root, 'sitemap.xml'), 'utf8');
  for (const block of xml.split('<url>').slice(1)) {
    const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1];
    const lastmod = block.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1] ?? '';
    if (loc && (!since || lastmod >= since)) urls.push(loc);
  }
}
urls = [...new Set(urls)].filter((u) => new URL(u).host === HOST);
if (!urls.length) {
  console.error('No URLs to submit. Pass URLs, --sitemap, or --since YYYY-MM-DD.');
  process.exit(1);
}

const keyLocation = `https://${HOST}/${key}.txt`;
const live = await fetch(keyLocation);
if (!live.ok || (await live.text()).trim() !== key) {
  console.error(`Key file is not live at ${keyLocation} yet. Deploy first, then rerun.`);
  process.exit(1);
}

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key, keyLocation, urlList: urls }),
});
// 200 = accepted, 202 = accepted and key validation pending; anything else is an error.
console.log(`IndexNow: HTTP ${res.status} for ${urls.length} URL(s)`);
if (![200, 202].includes(res.status)) {
  console.error(await res.text());
  process.exit(1);
}
