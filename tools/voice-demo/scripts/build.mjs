/**
 * Bundles src/ into ../../js/voice-demo.js as a single classic script.
 *
 * The output is committed. The site has no build step at its root — Vercel
 * serves it as static files — so the generated bundle has to live in the repo
 * next to the hand-written CSS.
 *
 * PUBLIC_DEMO_MODE is baked in here as a define. It defaults to `disabled`, so
 * a build run with no environment configured produces a widget that renders
 * nothing. A staging build is:
 *
 *     PUBLIC_DEMO_MODE=enabled npm run build
 *
 * The value can still be overridden at runtime (meta tag, inline config, or
 * ?voicedemo= for QA) — see src/config.ts for the precedence order.
 */

import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const outfile = path.resolve(root, '../../js/voice-demo.js');

const mode = process.env.PUBLIC_DEMO_MODE === 'enabled' ? 'enabled' : 'disabled';

const banner = `/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Built from tools/voice-demo/src by tools/voice-demo/scripts/build.mjs.
 * Edit the TypeScript source and re-run \`npm run build\` in tools/voice-demo.
 *
 * PUBLIC_DEMO_MODE baked into this build: ${mode}
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
  define: {
    __PUBLIC_DEMO_MODE__: JSON.stringify(mode),
  },
  logLevel: 'info',
  metafile: true,
});

const bytes = Object.values(result.metafile.outputs)[0]?.bytes ?? 0;
console.log(`voice-demo: ${(bytes / 1024).toFixed(1)} kB → js/voice-demo.js (PUBLIC_DEMO_MODE=${mode})`);
