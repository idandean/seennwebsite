/**
 * Bundles src/ into ../../js/voice-demo.js as a single classic script.
 *
 * The output is committed. The site has no build step at its root — Vercel
 * serves it as static files — so the generated bundle has to live in the repo
 * next to the hand-written CSS.
 *
 * There is deliberately NO PUBLIC_DEMO_MODE define here. An earlier revision
 * baked the flag in at build time, which implied an environment-variable
 * pipeline this repository does not have (Vercel env vars never reach a static
 * site) and gave enabling a second route. The demo is now enabled by exactly
 * one thing: a `window.SEENN_VOICE_DEMO` block in the page.
 *
 * The build is deterministic: same source in, byte-identical bundle out. CI and
 * the commit hook can therefore assert that js/voice-demo.js matches src/.
 *
 * See tools/voice-demo/CONFIGURATION.md.
 */

import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const outfile = path.resolve(root, '../../js/voice-demo.js');

const banner = `/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Built from tools/voice-demo/src by tools/voice-demo/scripts/build.mjs.
 * Edit the TypeScript source and re-run \`npm run build\` in tools/voice-demo.
 *
 * The public voice demo is enabled only by a window.SEENN_VOICE_DEMO block in
 * the page — see tools/voice-demo/CONFIGURATION.md. Nothing is baked in here.
 */`;

// The browser widget.
const result = await build({
  entryPoints: [path.resolve(root, 'src/index.ts')],
  outfile,
  bundle: true,
  format: 'iife',
  target: ['es2019'],
  platform: 'browser',
  minify: false, // a readable artefact is worth more than the bytes here
  sourcemap: false,
  legalComments: 'none',
  banner: { js: banner },
  logLevel: 'info',
  metafile: true,
});

// The same-origin Vercel Edge Function. ESM, because that is what Vercel's
// edge runtime expects, and emitted into /api so Vercel routes it with no root
// package.json and no build step of its own.
// .mjs, not .js: this repository has no root package.json (deliberately — see
// CONFIGURATION.md), so Vercel's Node builder parses a bare .js as CommonJS
// and an ESM `export` becomes a SyntaxError at invocation. `.mjs` is
// unambiguously ESM regardless of package.json, which is what lets the
// `export const config = { runtime: 'edge' }` marker be read at all.
const apiOutfile = path.resolve(root, '../../api/voice-demo-language.mjs');
const apiResult = await build({
  entryPoints: [path.resolve(root, 'src/api/voice-demo-language.ts')],
  outfile: apiOutfile,
  bundle: true,
  format: 'esm',
  target: ['es2022'],
  platform: 'neutral',
  minify: false,
  sourcemap: false,
  legalComments: 'none',
  banner: { js: banner },
  logLevel: 'info',
  metafile: true,
});

const bytes = Object.values(result.metafile.outputs)[0]?.bytes ?? 0;
const apiBytes = Object.values(apiResult.metafile.outputs)[0]?.bytes ?? 0;
console.log(`voice-demo: ${(bytes / 1024).toFixed(1)} kB → js/voice-demo.js`);
console.log(`voice-demo-language: ${(apiBytes / 1024).toFixed(1)} kB → api/voice-demo-language.mjs`);
