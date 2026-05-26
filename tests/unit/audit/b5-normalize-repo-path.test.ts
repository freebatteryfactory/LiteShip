/**
 * CUT B5b — one repo-path slash normalizer; distinct ops kept distinct.
 *
 * `@czap/audit`'s `normalizeRepoPath` (slash-only: `value.replace(/\\/g, '/')`)
 * is the single home for pure repo-path slash normalization. B5b collapses the
 * scattered private `normalizePath` copies and inline `replace(/\\/g, '/')`
 * one-liners onto it — but does NOT force-merge semantically distinct path
 * operations (regex prefix-trim, URL↔fs round-trip, dry-run redaction, /@fs
 * browser URL, test-alias join) that merely share the `\\→/` substring.
 *
 * These tests (1) pin the normalizer's cross-platform behavior, (2) cage the
 * seam so a second inline slash-normalizer can't drift into a published package,
 * and (3) prove no package-graph poisoning (@czap/core ↛ @czap/audit; @czap/audit
 * keeps zero @czap edges — the D9b standalone law).
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { normalizeRepoPath } from '@czap/audit';

const REPO = resolve(import.meta.dirname, '..', '..', '..');

const walkTs = (root: string): string[] => {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) out.push(full);
    }
  };
  walk(root);
  return out;
};
const rel = (abs: string): string => abs.replace(/\\/g, '/').replace(`${REPO.replace(/\\/g, '/')}/`, '');

describe('B5b — normalizeRepoPath cross-platform behavior (the pinned contract)', () => {
  // The contract is intentionally minimal: convert backslashes to forward slashes,
  // change NOTHING else. Trailing slash PRESERVED, drive-letter case PRESERVED.
  const cases: ReadonlyArray<readonly [string, string]> = [
    ['C:\\foo\\bar', 'C:/foo/bar'], // Windows absolute
    ['c:\\foo\\bar', 'c:/foo/bar'], // drive-letter case preserved (not lowercased)
    ['/foo/bar', '/foo/bar'], // POSIX passthrough
    ['foo\\bar/baz', 'foo/bar/baz'], // mixed separators
    ['packages\\core\\src', 'packages/core/src'], // relative Windows
    ['packages/core/src', 'packages/core/src'], // idempotent
    ['C:\\foo\\bar\\', 'C:/foo/bar/'], // trailing separator preserved
    ['.', '.'], // current-dir identity
    ['', ''], // empty identity
  ];
  for (const [input, expected] of cases) {
    it(`${JSON.stringify(input)} → ${JSON.stringify(expected)}`, () => {
      expect(normalizeRepoPath(input)).toBe(expected);
    });
  }

  it('is idempotent (already-normalized input is unchanged)', () => {
    for (const [, expected] of cases) expect(normalizeRepoPath(expected)).toBe(expected);
  });
});

describe('B5b — exactly one slash-normalize home in published packages (the cage)', () => {
  // The ONLY packages/ files allowed to inline `\\→/` are: the helper definition
  // itself, and the two DOCUMENTED distinct ops that are not repo-path normalization.
  const ALLOWLIST = new Set([
    'packages/audit/src/policy.ts', // the normalizeRepoPath definition
    'packages/core/src/config.ts', // toTestAliases: vitest-alias URL join (NOT repo-path normalization; @czap/core must not import @czap/audit)
    'packages/vite/src/plugin.ts', // /@fs/ browser URL construction (a URL segment, not a filesystem path)
  ]);
  const SLASH_REPLACE = /\.replace\(\/\\\\\/g,\s*['"]\/['"]\)/;

  it('no published-package file inlines a slash-normalizer except the helper + documented distinct ops', () => {
    const offenders = walkTs(resolve(REPO, 'packages'))
      .filter((f) => SLASH_REPLACE.test(readFileSync(f, 'utf8')))
      .map(rel)
      .filter((r) => !ALLOWLIST.has(r));
    expect(offenders).toEqual([]); // any new inline slash-normalize must route through normalizeRepoPath
  });

  it('normalizeRepoPath is defined exactly once under packages/', () => {
    const definers = walkTs(resolve(REPO, 'packages')).filter((f) => /function\s+normalizeRepoPath\b/.test(readFileSync(f, 'utf8')));
    expect(definers.map(rel)).toEqual(['packages/audit/src/policy.ts']);
  });
});

describe('B5b — no package-graph poisoning', () => {
  it('@czap/core does not import @czap/audit', () => {
    const importers = walkTs(resolve(REPO, 'packages/core/src')).filter((f) => /from\s+['"]@czap\/audit/.test(readFileSync(f, 'utf8')));
    expect(importers.map(rel)).toEqual([]);
  });

  it('@czap/audit keeps zero @czap edges (D9b standalone law)', () => {
    const importers = walkTs(resolve(REPO, 'packages/audit/src')).filter((f) => /from\s+['"]@czap\//.test(readFileSync(f, 'utf8')));
    expect(importers.map(rel)).toEqual([]);
  });
});
