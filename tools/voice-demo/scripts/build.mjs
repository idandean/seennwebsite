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

const bytes = Object.values(result.metafile.outputs)[0]?.bytes ?? 0;
console.log(`voice-demo: ${(bytes / 1024).toFixed(1)} kB → js/voice-demo.js`);
