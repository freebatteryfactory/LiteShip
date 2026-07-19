/**
 * The shared TEST-CORPUS reader — collect every `*.test.ts` across the repo's test
 * tiers, once, with its bytes, as repo-relative POSIX ids. A pure, deterministic
 * function of the on-disk test bytes (no clock, no rng, no network).
 *
 * The LOCAL-VS-GLOBAL host builders ({@link buildProofFacts} /
 * {@link buildCompositionFacts}) scan the corpus for the deep-import / property-test /
 * PROVES-header / both-endpoints signals; this module is the ONE corpus walk they
 * share, so the test-tier set + the recursion are defined in a single place (never
 * re-implemented inline).
 *
 * @module
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { normalizeRepoPath } from '@liteship/audit';

/** The repo-relative test roots scanned for the corpus (the vitest include set). */
const TEST_ROOTS: readonly string[] = [
  'tests/unit',
  'tests/integration',
  'tests/bench',
  'tests/smoke',
  'tests/property',
  'tests/component',
  'tests/regression',
  'tests/generated',
];

/** A discovered test file — its repo-relative POSIX id + its raw bytes (read once). */
export interface RepoTestFile {
  /** The repo-relative POSIX path (the stable id). */
  readonly id: string;
  /** The file's raw UTF-8 text (read once; the signal scans run over this). */
  readonly text: string;
}

/**
 * Recursively collect every `*.test.ts` file under `root` (repo-relative POSIX ids),
 * reading each one's bytes once. The established cli `readdirSync` recursion (no new
 * glob dependency). A MISSING root is skipped (a repo without that test tier is
 * valid); any OTHER read fault propagates (never a silent swallow).
 */
function collectUnder(repoRoot: string, root: string): RepoTestFile[] {
  const out: RepoTestFile[] = [];
  const walk = (relDir: string): void => {
    let names: readonly string[];
    try {
      names = readdirSync(join(repoRoot, relDir));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw err;
    }
    for (const name of names) {
      const relPath = normalizeRepoPath(`${relDir}/${name}`);
      const stat = statSync(join(repoRoot, relPath));
      if (stat.isDirectory()) {
        walk(relPath);
      } else if (stat.isFile() && name.endsWith('.test.ts')) {
        out.push({ id: relPath, text: readFileSync(join(repoRoot, relPath), 'utf8') });
      }
    }
  };
  walk(root);
  return out;
}

/**
 * Collect the WHOLE test corpus across {@link TEST_ROOTS}, de-duplicated by id and
 * sorted (deterministic). Read once — callers scan the returned bytes for their
 * signals.
 */
export function collectRepoTestFiles(repoRoot: string): readonly RepoTestFile[] {
  const seen = new Set<string>();
  const tests: RepoTestFile[] = [];
  for (const root of TEST_ROOTS) {
    for (const t of collectUnder(repoRoot, root)) {
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      tests.push(t);
    }
  }
  tests.sort((a, b) => a.id.localeCompare(b.id));
  return tests;
}
