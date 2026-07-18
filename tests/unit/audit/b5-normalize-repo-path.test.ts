/**
 * CUT B5b — one repo-path slash normalizer per bundle domain; distinct ops kept distinct.
 *
 * `normalizeRepoPath` (slash-only: `value.replace(/\\/g, '/')`) is the single home
 * for pure repo-path slash normalization — but Wave 7 (S7.1) split it into TWO
 * D9b-PARTITIONED PARITY HOMES that are byte-identical and drift-guarded (the
 * parity assertion below), NOT two independent implementations:
 *   • `@czap/core`'s browser-safe `path-normalize` leaf — the home for browser/
 *     core/vite/astro/scripts consumers;
 *   • `@czap/audit`'s `policy.ts` — the LEAN-AUDIT home, because D9b forbids
 *     `@czap/audit` from importing the heavy `@czap/core` runtime (audit stays
 *     downstream-installable) and B5b forbids `@czap/core` from importing
 *     `@czap/audit`, so neither can re-export the other — the parity copy is the
 *     only D9b-legal shared contract. `import … from '@czap/audit'` (the cli's
 *     pinned path) resolves to the audit twin.
 * B5b still does NOT force-merge semantically distinct path operations (regex
 * prefix-trim, URL↔fs round-trip, dry-run redaction, /@fs browser URL, test-alias
 * join) that merely share the `\\→/` substring.
 *
 * These tests (1) pin the normalizer's cross-platform behavior, (2) cage the seam
 * so a second inline slash-normalizer can't drift into a published package, (3)
 * pin the two homes byte-identical (the parity drift-guard), and (4) prove no
 * package-graph poisoning (@czap/core ↛ @czap/audit; @czap/audit keeps zero heavy
 * @czap edges — the D9b standalone law: only @czap/error/gauntlet/canonical).
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { normalizeRepoPath } from '@czap/audit';
import { normalizeRepoPath as normalizeRepoPathCore } from '@czap/core';

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

describe('B5b — the two D9b-partitioned slash-normalize homes (the cage)', () => {
  // The ONLY packages/ files allowed to inline `\\→/` are: the TWO parity-home
  // definitions (lean-audit + browser-core), and the DOCUMENTED distinct ops that
  // are not repo-path normalization.
  const ALLOWLIST = new Set([
    'packages/audit/src/policy.ts', // the LEAN-AUDIT normalizeRepoPath home (D9b: audit can't import @czap/core)
    'packages/core/src/path-normalize.ts', // the BROWSER-CORE normalizeRepoPath home (parity twin; browser consumers import this)
    'packages/core/src/config.ts', // toTestAliases: vitest-alias URL join (NOT repo-path normalization; @czap/core must not import @czap/audit)
    'packages/vite/src/plugin.ts', // /@fs/ browser URL construction (a URL segment, not a filesystem path)
  ]);
  const SLASH_REPLACE = /\.replace\(\/\\\\\/g,\s*['"]\/['"]\)/;

  it('no published-package file inlines a slash-normalizer except the two homes + documented distinct ops', () => {
    const offenders = walkTs(resolve(REPO, 'packages'))
      .filter((f) => SLASH_REPLACE.test(readFileSync(f, 'utf8')))
      .map(rel)
      .filter((r) => !ALLOWLIST.has(r));
    expect(offenders).toEqual([]); // any new inline slash-normalize must route through normalizeRepoPath
  });

  it('normalizeRepoPath is defined in exactly the two parity homes under packages/', () => {
    const definers = walkTs(resolve(REPO, 'packages')).filter((f) =>
      /function\s+normalizeRepoPath\b/.test(readFileSync(f, 'utf8')),
    );
    expect(definers.map(rel).sort()).toEqual(['packages/audit/src/policy.ts', 'packages/core/src/path-normalize.ts']);
  });

  it('the two homes are byte-identical (parity drift-guard — S7.1)', () => {
    // The D9b partition forces two implementations; this guard makes them ONE
    // contract in practice — any divergence between the audit twin and the core
    // twin reds here, exactly as a single home would have.
    const inputs = ['C:\\a\\b', 'c:\\A\\B\\', 'foo\\bar/baz', '/x/y', '.', '', 'packages\\core'];
    for (const input of inputs) {
      expect(normalizeRepoPath(input)).toBe(normalizeRepoPathCore(input));
    }
  });
});

describe('B5b — no package-graph poisoning', () => {
  it('@czap/core does not import @czap/audit', () => {
    const importers = walkTs(resolve(REPO, 'packages/core/src')).filter((f) =>
      /from\s+['"]@czap\/audit/.test(readFileSync(f, 'utf8')),
    );
    expect(importers.map(rel)).toEqual([]);
  });

  it('@czap/audit imports only the blessed standalone leaves (D9b + Slice B law)', () => {
    // D9b: the audit engine stays downstream-installable — it must not pull the
    // heavy monorepo runtime. The blessed edges are STANDALONE leaves that each
    // install from npm exactly like a third-party dep, so they do not poison the
    // package graph:
    //   • @czap/error    — the zero-dep error algebra (the @czap/_spine analogue);
    //   • @czap/gauntlet — Slice B (B1): the lean rigor engine DEFINES the RepoIR
    //     interface; audit is the HOST that BUILDS it (buildRepoIR). Gauntlet deps
    //     only @czap/error + fast-glob, so audit → gauntlet is acyclic;
    //   • @czap/canonical — the blake3 content-address kernel for per-file digests
    //     (deps only @czap/error + @noble/hashes), acyclic.
    // The audit engine references NO LiteShip-local contract (ADR-0012): it must
    // NOT import @czap/command — not even the pure `/invariants` subpath — because
    // that bakes LiteShip-LOCAL config (the NO_DEFAULT_EXPORT rule + its exclude
    // list) into the downstream-installable engine. The repo-IR builder emits only
    // STRUCTURAL AST facts (is-default-export / bare-throw, which any TS repo has)
    // and exposes a `FactOracle` injection hook; LiteShip's repo-LOCAL
    // invariant-regex oracle is built + INJECTED by the CLI HOST (which legitimately
    // deps @czap/command). Any @czap import beyond the three blessed leaves would
    // poison the package graph and is forbidden.
    const ALLOWED = /from\s+['"]@czap\/(?:error|gauntlet|canonical)['"]/;
    const importers = walkTs(resolve(REPO, 'packages/audit/src')).filter((f) => {
      const text = readFileSync(f, 'utf8');
      const lines = text.split('\n').filter((l) => /from\s+['"]@czap\//.test(l));
      return lines.some((l) => !ALLOWED.test(l));
    });
    expect(importers.map(rel)).toEqual([]);
  });
});
