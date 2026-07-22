/**
 * Categorized index of root npm scripts. Reads package.json, groups each
 * script under a category, and prints a human-readable map so newcomers
 * can find what to run without scrolling 60 lines of JSON. Unknown
 * scripts fall into the "other" bucket — fail-loud so the index stays
 * current with the manifest.
 *
 * @module
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { color, colorEnabled, header } from '../packages/cli/src/lib/ansi.js';
import { CATEGORIES, LIFECYCLE_SCRIPTS } from './lib/script-categories.js';

interface Pkg {
  readonly scripts?: Record<string, string>;
}

const pkgPath = resolve(import.meta.dirname, '..', 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as Pkg;
const all = pkg.scripts ?? {};
const known = new Set<string>();
for (const cat of CATEGORIES) for (const s of cat.scripts) known.add(s);

const widest = Math.max(
  ...Object.keys(all).map((k) => k.length),
  ...CATEGORIES.flatMap((c) => c.scripts.map((s) => s.length)),
);

const on = colorEnabled(process.stdout);

process.stdout.write(`${header('LiteShip', on)} — script catalog (npm scripts)\n\n`);

for (const cat of CATEGORIES) {
  const present = cat.scripts.filter((s) => s in all);
  if (present.length === 0) continue;
  process.stdout.write(`${color('cyan', cat.name, on)}\n  ${color('dim', cat.description, on)}\n`);
  for (const s of present) {
    const cmd = all[s] ?? '';
    const truncated = cmd.length > 80 ? cmd.slice(0, 77) + '...' : cmd;
    process.stdout.write(`  pnpm ${s.padEnd(widest, ' ')}  ${color('dim', truncated, on)}\n`);
  }
  process.stdout.write('\n');
}

// Surface uncategorized scripts so the index stays honest as the manifest grows.
const lifecycle = new Set<string>(LIFECYCLE_SCRIPTS);
const other = Object.keys(all).filter((s) => !known.has(s) && !lifecycle.has(s));
if (other.length > 0) {
  process.stdout.write(`${color('yellow', 'other', on)} ${color('dim', '(uncategorized — consider adding to scripts/scripts-index.ts)', on)}\n`);
  for (const s of other) {
    const cmd = all[s] ?? '';
    const truncated = cmd.length > 80 ? cmd.slice(0, 77) + '...' : cmd;
    process.stdout.write(`  pnpm ${s.padEnd(widest, ' ')}  ${color('dim', truncated, on)}\n`);
  }
  process.stdout.write('\n');
}

process.stdout.write(
  `${color('dim', 'Tip:', on)} \`${color('cyan', 'liteship help', on)}\` prints the command list; \`${color('cyan', 'liteship glossary', on)}\` explains the vocabulary.\n`,
);
