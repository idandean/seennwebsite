// Fails when /css/tailwind.css is out of date with the pages, e.g. a page was added or edited
// with new Tailwind classes but `npm run build` was not run. Usage: `npm run check`.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const cli = path.join(here, 'node_modules', 'tailwindcss', 'lib', 'cli.js');
const fresh = execFileSync(process.execPath, [cli, '-c', 'tailwind.config.js', '-i', 'input.css', '--minify'], { cwd: here, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
const committed = readFileSync(path.join(here, '..', '..', 'css', 'tailwind.css'), 'utf8');

if (fresh.trim() !== committed.trim()) {
  console.error('css/tailwind.css is out of date. Run `npm run build` in tools/tailwind and commit the result.');
  process.exit(1);
}
console.log('css/tailwind.css is up to date.');
