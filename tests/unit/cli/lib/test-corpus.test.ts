/**
 * The shared TEST-CORPUS reader (`packages/cli/src/lib/test-corpus.ts`) — the ONE
 * corpus walk the local-vs-global host builders share. A pure, deterministic function
 * of the on-disk test bytes (no clock, no rng, no network).
 *
 * Pins (over an isolated temp repo so the corpus is fully controlled):
 *  - the TEST-TIER set: a `*.test.ts` under each scanned root (tests/unit … generated)
 *    is collected; a file outside every root is NOT.
 *  - the RECURSION: a `*.test.ts` nested arbitrarily deep under a root is collected.
 *  - the EXTENSION gate: only `*.test.ts` files (not `.ts` / `.test.tsx` / dirs) count.
 *  - the BYTES-READ-ONCE contract: each returned file carries its exact UTF-8 text.
 *  - DETERMINISM: id-sorted, de-duplicated, POSIX-normalized ids — stable across runs.
 *  - the MISSING-ROOT tolerance: a repo without a tier is valid (skipped, never throws);
 *    any OTHER read fault propagates (never a silent swallow).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import fc from 'fast-check';
import { collectRepoTestFiles, type RepoTestFile } from '../../../../packages/cli/src/lib/test-corpus.js';

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'czap-corpus-'));
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

/** Write a file at a repo-relative POSIX path, creating parent dirs. */
function write(rel: string, text: string): void {
  const full = join(root, ...rel.split('/'));
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, text, 'utf8');
}

/** The eight roots the corpus reader scans (mirror of TEST_ROOTS — a drift pin). */
const TEST_ROOTS = [
  'tests/unit',
  'tests/integration',
  'tests/bench',
  'tests/smoke',
  'tests/property',
  'tests/component',
  'tests/regression',
  'tests/generated',
] as const;

describe('test-corpus reader — the test-tier set', () => {
  it('collects a *.test.ts under EVERY scanned root, one entry per root', () => {
    for (const r of TEST_ROOTS) write(`${r}/x.test.ts`, '// x');
    const corpus = collectRepoTestFiles(root);
    const ids = corpus.map((t) => t.id);
    for (const r of TEST_ROOTS) {
      expect(ids).toContain(`${r}/x.test.ts`);
    }
    expect(corpus).toHaveLength(TEST_ROOTS.length);
  });

  it('does NOT collect a *.test.ts that lives OUTSIDE every scanned root', () => {
    write('tests/unit/in.test.ts', '// in');
    // `src/` and a bare `tests/` (no tier) are outside the scanned set.
    write('src/out.test.ts', '// out');
    write('tests/out.test.ts', '// out');
    write('packages/cli/out.test.ts', '// out');
    const ids = collectRepoTestFiles(root).map((t) => t.id);
    expect(ids).toEqual(['tests/unit/in.test.ts']);
  });
});

describe('test-corpus reader — recursion + the extension gate', () => {
  it('recurses arbitrarily deep under a root', () => {
    write('tests/unit/a.test.ts', '// a');
    write('tests/unit/sub/b.test.ts', '// b');
    write('tests/unit/sub/deeper/c.test.ts', '// c');
    const ids = collectRepoTestFiles(root).map((t) => t.id);
    expect(ids).toEqual([
      'tests/unit/a.test.ts',
      'tests/unit/sub/b.test.ts',
      'tests/unit/sub/deeper/c.test.ts',
    ]);
  });

  it('collects ONLY *.test.ts — a plain .ts, a .test.tsx, and a *.test.ts directory do not count', () => {
    write('tests/unit/real.test.ts', '// real');
    write('tests/unit/helper.ts', '// helper'); // not *.test.ts
    write('tests/unit/widget.test.tsx', '// tsx'); // wrong extension
    write('tests/unit/fixtures.test.ts/inner.ts', '// dir named like a test'); // a DIR ending .test.ts
    const ids = collectRepoTestFiles(root).map((t) => t.id);
    expect(ids).toEqual(['tests/unit/real.test.ts']);
  });
});

describe('test-corpus reader — the bytes-read-once contract', () => {
  it('carries each file’s exact UTF-8 text', () => {
    const body = '// PROVES: INV-Z\nconst π = "λ — unicode ✓";\n';
    write('tests/property/u.test.ts', body);
    const corpus = collectRepoTestFiles(root);
    expect(corpus).toHaveLength(1);
    expect(corpus[0]!.text).toBe(body);
    expect(corpus[0]!.id).toBe('tests/property/u.test.ts');
  });
});

describe('test-corpus reader — determinism', () => {
  it('returns id-sorted entries regardless of on-disk creation order', () => {
    // Write in a deliberately non-sorted order across roots.
    write('tests/unit/zzz.test.ts', '// z');
    write('tests/bench/aaa.test.ts', '// a');
    write('tests/property/mmm.test.ts', '// m');
    const ids = collectRepoTestFiles(root).map((t) => t.id);
    const sorted = [...ids].sort((a, b) => a.localeCompare(b));
    expect(ids).toEqual(sorted);
  });

  it('is a pure function of the on-disk bytes — two runs are byte-identical', () => {
    write('tests/unit/a.test.ts', '// a');
    write('tests/integration/b.test.ts', '// b');
    const first = collectRepoTestFiles(root);
    const second = collectRepoTestFiles(root);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it('PROPERTY: any set of distinct *.test.ts files yields a sorted, complete, deduped id set', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(
          fc.tuple(
            fc.constantFrom(...TEST_ROOTS),
            fc
              .array(
                fc
                  .stringMatching(/^[a-z][a-z0-9]{0,7}$/)
                  .filter((s) => s.length > 0),
                { minLength: 1, maxLength: 3 },
              )
              .map((segs) => `${segs.join('/')}.test.ts`),
          ),
          { selector: ([r, rel]) => `${r}/${rel}`, minLength: 1, maxLength: 12 },
        ),
        (entries) => {
          const fresh = mkdtempSync(join(tmpdir(), 'czap-corpus-prop-'));
          try {
            const expected = new Set<string>();
            for (const [r, rel] of entries) {
              const id = `${r}/${rel}`;
              const full = join(fresh, ...id.split('/'));
              mkdirSync(join(full, '..'), { recursive: true });
              writeFileSync(full, `// ${id}`, 'utf8');
              expected.add(id);
            }
            const corpus = collectRepoTestFiles(fresh);
            const ids = corpus.map((t: RepoTestFile) => t.id);
            // Complete: every written test appears.
            expect(new Set(ids)).toEqual(expected);
            // Sorted.
            expect(ids).toEqual([...ids].sort((a, b) => a.localeCompare(b)));
            // Deduped (ids form a set of exactly the written size).
            expect(ids.length).toBe(expected.size);
          } finally {
            rmSync(fresh, { recursive: true, force: true });
          }
        },
      ),
      { numRuns: 30 },
    );
  });
});

describe('test-corpus reader — the missing-root tolerance', () => {
  it('skips a missing tier without throwing (a repo without that tier is valid)', () => {
    // Only ONE tier exists; the other seven roots are absent.
    write('tests/unit/only.test.ts', '// only');
    expect(() => collectRepoTestFiles(root)).not.toThrow();
    expect(collectRepoTestFiles(root).map((t) => t.id)).toEqual(['tests/unit/only.test.ts']);
  });

  it('returns the empty corpus when NO test tier exists at all', () => {
    // An empty repo root — every scanned tier is absent.
    expect(collectRepoTestFiles(root)).toEqual([]);
  });

  it('propagates a non-ENOENT read fault (never a silent swallow)', () => {
    // A FILE where the reader expects a directory: readdirSync on a file throws
    // ENOTDIR (not ENOENT), which must propagate per the contract.
    writeFileSync(join(root, 'tests'), 'not a dir', 'utf8');
    // `tests/unit` resolves through `tests` (a file) → ENOTDIR on readdir.
    expect(() => collectRepoTestFiles(root)).toThrow();
  });
});
