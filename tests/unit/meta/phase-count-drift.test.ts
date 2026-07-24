// @vitest-environment node
/**
 * Phase-count drift guard — hardcoded counts ("41-phase", "28-phase", "14 packages")
 * rot the moment the underlying sequence or workspace grows a member. A comment that
 * says "the 41-phase gauntlet" is a lie the instant a phase is added, and nothing
 * fails to catch it. This guard bans the shape outright: production source and the
 * dev scripts must describe counts derivable-at-runtime (`gauntletPhases.length`,
 * "all workspace packages") rather than pinning a literal that silently diverges.
 *
 * Scope: `packages/*` + '/src' + '**' + '/*.ts' and `scripts/**' + '/*.ts` — the two
 * surfaces this partition owns and where such prose accumulates. node_modules / dist
 * are skipped (generated / vendored). Tests are out of scope (they legitimately assert
 * against literal counts).
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';

const REPO = resolve(import.meta.dirname, '..', '..', '..');
const PACKAGES = resolve(REPO, 'packages');
const SCRIPTS = resolve(REPO, 'scripts');

/** `<digits>-phase` / `<digits> phase` — a pinned gauntlet/sequence phase count. */
const PHASE_COUNT = /\b\d+[- ]phase\b/;
/** `<digits> packages` — a pinned workspace / discovery package count. */
const PACKAGE_COUNT = /\b\d+\s+packages\b/;

/** Recursively collect every `.ts` file under `dir`, skipping node_modules / dist. */
function collectTs(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      collectTs(full, out);
    } else if (entry.name.endsWith('.ts')) {
      out.push(full);
    }
  }
}

/** Every `.ts` under `packages/**` + '/src' and `scripts/**`. */
function scannedFiles(): string[] {
  const out: string[] = [];
  for (const pkg of readdirSync(PACKAGES, { withFileTypes: true })) {
    if (!pkg.isDirectory()) continue;
    const src = join(PACKAGES, pkg.name, 'src');
    if (existsSync(src)) collectTs(src, out);
  }
  if (existsSync(SCRIPTS)) collectTs(SCRIPTS, out);
  return out;
}

function offenders(pattern: RegExp): string[] {
  const hits: string[] = [];
  for (const file of scannedFiles()) {
    const src = readFileSync(file, 'utf8');
    for (const line of src.split('\n')) {
      if (pattern.test(line)) hits.push(`${relative(REPO, file)}: ${line.trim()}`);
    }
  }
  return hits.sort();
}

describe('phase-count drift — no hardcoded phase / package counts in product source', () => {
  it('no `N-phase` count literal in packages/**/src or scripts/**', () => {
    const hits = offenders(PHASE_COUNT);
    expect(hits, `replace hardcoded phase counts with a derived length:\n${hits.join('\n')}`).toEqual([]);
  });

  it('no `N packages` count literal in packages/**/src or scripts/**', () => {
    const hits = offenders(PACKAGE_COUNT);
    expect(hits, `replace hardcoded package counts with count-free wording:\n${hits.join('\n')}`).toEqual([]);
  });
});
