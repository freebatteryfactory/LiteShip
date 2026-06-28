#!/usr/bin/env tsx
/**
 * Fills the generated registry blocks in README.md from the single sources of
 * truth (package.json descriptions + scripts/lib/doc-registry.ts + the committed
 * benchmark snapshot). Run `pnpm run docs:gen` after adding a package, renaming
 * an example, or refreshing the bench snapshot. `--check` (used by the drift
 * test and CI) regenerates in memory and fails if the committed file drifted.
 *
 * Each block is delimited by `<!-- BEGIN <NAME> ... -->` / `<!-- END <NAME> -->`
 * in the target file; everything between is owned by this generator.
 *
 * @module
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { REPO_ROOT, renderPackagesBlock, renderExamplesBlock } from './lib/doc-registry.js';
import { renderBenchBlock } from './lib/bench-snapshot.js';

interface Block {
  readonly name: string;
  readonly file: string;
  readonly render: () => string;
}

const BLOCKS: readonly Block[] = [
  { name: 'PACKAGES', file: 'README.md', render: renderPackagesBlock },
  { name: 'EXAMPLES', file: 'README.md', render: renderExamplesBlock },
  { name: 'BENCH', file: 'README.md', render: renderBenchBlock },
];

/** Replace the inner content of one delimited block; throws if the markers are absent. */
function applyBlock(source: string, name: string, inner: string): string {
  const re = new RegExp(`(<!-- BEGIN ${name}[^]*?-->\\n)[^]*?(\\n<!-- END ${name} -->)`);
  if (!re.test(source)) throw new Error(`gen-docs: markers for block "${name}" not found`);
  return source.replace(re, `$1${inner}$2`);
}

const check = process.argv.includes('--check');
const byFile = new Map<string, Block[]>();
for (const b of BLOCKS) (byFile.get(b.file) ?? byFile.set(b.file, []).get(b.file)!).push(b);

let drift = false;
for (const [file, blocks] of byFile) {
  const path = resolve(REPO_ROOT, file);
  const current = readFileSync(path, 'utf8');
  let next = current;
  for (const b of blocks) next = applyBlock(next, b.name, b.render());
  if (next === current) {
    console.log(`docs:gen — ${file} up to date`);
    continue;
  }
  if (check) {
    drift = true;
    console.error(`docs:gen --check — ${file} is out of date. Run 'pnpm run docs:gen' and commit.`);
  } else {
    writeFileSync(path, next);
    console.log(`docs:gen — regenerated ${file}`);
  }
}

if (drift) process.exit(1);
