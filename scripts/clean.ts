/**
 * Clean — purge build/test artifacts so the next run starts from an
 * empty deck. Removes:
 *   - packages/<all>/dist
 *   - packages/<all>/*.tsbuildinfo
 *   - root tsconfig.tsbuildinfo
 *   - coverage/
 *   - reports/ (only generated artifacts, not docs/adr or other source)
 *   - .liteship/generated/
 *   - benchmarks/raw/ (keep history.jsonl)
 *
 * Does not touch node_modules; use `pnpm install --frozen-lockfile` (or
 * delete node_modules manually) for that.
 *
 * @module
 */

import { existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { color, colorEnabled, header } from '../packages/cli/src/lib/ansi.js';

const repoRoot = resolve(import.meta.dirname, '..');

const removed: string[] = [];
const skipped: string[] = [];

function rmIfPresent(absPath: string): void {
  const rel = absPath.startsWith(repoRoot) ? absPath.slice(repoRoot.length + 1) : absPath;
  if (!existsSync(absPath)) {
    skipped.push(rel);
    return;
  }
  rmSync(absPath, { recursive: true, force: true });
  removed.push(rel);
}

/**
 * Selective version of rmIfPresent — wipes a directory's contents while
 * keeping the named entries. Used for benchmarks/raw where history.jsonl
 * is the cross-run trend ledger (deleting it would skew bench:trend
 * comparisons), but the rest of the dir is per-run scratch.
 */
function rmContentsExcept(dirPath: string, keep: ReadonlySet<string>): void {
  const rel = dirPath.startsWith(repoRoot) ? dirPath.slice(repoRoot.length + 1) : dirPath;
  if (!existsSync(dirPath)) {
    skipped.push(rel);
    return;
  }
  let rmCount = 0;
  for (const entry of readdirSync(dirPath)) {
    if (keep.has(entry)) continue;
    rmSync(resolve(dirPath, entry), { recursive: true, force: true });
    rmCount += 1;
  }
  if (rmCount > 0) removed.push(`${rel} (kept: ${[...keep].join(', ')})`);
}

function cleanPackages(): void {
  const packagesDir = resolve(repoRoot, 'packages');
  if (!existsSync(packagesDir)) return;
  for (const entry of readdirSync(packagesDir)) {
    const pkgDir = resolve(packagesDir, entry);
    if (!statSync(pkgDir).isDirectory()) continue;
    rmIfPresent(resolve(pkgDir, 'dist'));
    rmIfPresent(resolve(pkgDir, 'tsconfig.tsbuildinfo'));
  }
}

function cleanRoot(): void {
  rmIfPresent(resolve(repoRoot, 'tsconfig.tsbuildinfo'));
  rmIfPresent(resolve(repoRoot, 'tsconfig.scripts.tsbuildinfo'));
  rmIfPresent(resolve(repoRoot, 'tsconfig.tests.tsbuildinfo'));
  rmIfPresent(resolve(repoRoot, 'coverage'));
  // The module docstring claims reports/ is wiped; previously cleanRoot
  // didn't actually touch it, leaving stale reports/capsule-manifest.json
  // and audit outputs to mislead later runs. Fix per Codex P2 review.
  rmIfPresent(resolve(repoRoot, 'reports'));
  rmIfPresent(resolve(repoRoot, '.liteship/generated'));
  // benchmarks/raw holds cross-run trend ledger (history.jsonl) plus
  // per-run scratch. Wholesale rmIfPresent would erase the ledger and
  // skew bench:trend comparisons. Keep history.jsonl, wipe the rest.
  rmContentsExcept(resolve(repoRoot, 'benchmarks/raw'), new Set(['history.jsonl']));
}

cleanPackages();
cleanRoot();

const quiet = process.env.LITESHIP_QUIET_INSTALL || process.env.CI;
if (!quiet) {
  const on = colorEnabled();
  process.stderr.write(`${header('Clean', on)}: ${color('cyan', String(removed.length), on)} artifact(s) cleared.\n`);
  for (const r of removed) process.stderr.write(`  ${color('dim', '-', on)} ${r}\n`);
  if (removed.length === 0) {
    process.stderr.write(`  ${color('dim', 'Deck was already clear; nothing to scrape.', on)}\n`);
  }
}
