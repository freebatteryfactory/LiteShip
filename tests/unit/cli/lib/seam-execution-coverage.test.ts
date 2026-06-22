/**
 * The EXECUTION-COVERAGE map proof (Slice C, the avionics tier — the barrel-problem
 * fix for `czap check --ir --mutate`). The execution filter prunes the ~220 `@czap/core`
 * barrel importers of a broad L4 seam to the handful that actually EXECUTE a function
 * of the seam, making the broad seams tractable WITHOUT under-mapping (an under-mapped
 * seam mints a false survivor — the worst error). This suite proves the two
 * load-bearing properties the soundness rests on, with an INJECTED deterministic probe
 * (no real coverage subprocess), so it is fast + flake-free while exercising the real
 * relation-building + map-folding path:
 *
 *  1. SOUNDNESS — a barrel importer that executes a function of the seam is KEPT for
 *     that function's lines; a barrel importer that executes NO function of the seam is
 *     EXCLUDED from the seam's function-body lines (it provably never enters the seam,
 *     so it could never kill a mutant there); a TOP-LEVEL line (inside no covered
 *     function) keeps the FULL barrel closure (every importer runs module-init on
 *     import, so a top-level mutant is never under-mapped); a DEEP importer covers
 *     every line.
 *  2. DETERMINISM — the SAME inputs (seam bytes, test corpus, injected probe) build
 *     a BYTE-IDENTICAL covering set on every run.
 *
 * The probe is INJECTED, so this proof is hermetic. The integration with the real
 * scoped-v8-coverage probe is proven by the live `czap check --ir --mutate` run.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { MutationTargetFile } from '../../../../packages/audit/src/index.js';
import { buildSeamCoverageMap } from '../../../../packages/cli/src/lib/mutation-targets.js';
import {
  executionCoverageRelation,
  parseCoveredFunctionRanges,
  parseBatchedCoveredFunctionRanges,
  type BatchedSeamCoverageProbe,
  type LineRange,
  type SeamTestExecution,
} from '../../../../packages/cli/src/lib/seam-execution-coverage.js';
import { makeCoverageMap } from '../../../../packages/audit/src/index.js';

/**
 * A seam with a clear top-level line + a function body. Line layout (1-based):
 *   1: `// header`              ← top-level (outside any function)
 *   2: `export const X = 1 > 2;`← top-level mutable (conditional-boundary site)
 *   3: `export function f(a) {` ← function f start
 *   4: `  return a === 0;`      ← function f body (equality site)
 *   5: `}`                      ← function f end
 */
const SEAM_FILE = 'packages/core/src/demo-seam.ts';
const SEAM_TEXT = ['// header', 'export const X = 1 > 2;', 'export function f(a) {', '  return a === 0;', '}'].join('\n');
const SEAM_LINES = SEAM_TEXT.split('\n').length; // 5

/** Build a throwaway repo dir with the seam's package + a set of test files. */
function makeRepo(tests: ReadonlyMap<string, string>): { root: string; seams: MutationTargetFile[] } {
  const root = mkdtempSync(join(tmpdir(), 'czap-seam-cov-test-'));
  for (const [rel, text] of tests) {
    const abs = join(root, rel);
    mkdirSync(join(abs, '..'), { recursive: true });
    writeFileSync(abs, text, 'utf8');
  }
  return { root, seams: [{ file: SEAM_FILE, text: SEAM_TEXT }] };
}

describe('seam execution coverage — the barrel-problem fix', () => {
  it('SOUNDNESS — excludes a barrel importer that executes no function; keeps the one that does; top-level lines keep the full barrel closure; deep importers cover every line', () => {
    // Three barrel importers of @czap/core + one deep importer.
    //  - barrel-executes:   imports the barrel AND (per the probe) executes function f.
    //  - barrel-imports-only: imports the barrel but executes NO function of the seam.
    //  - deep:              deep-imports the seam's source path.
    const tests = new Map<string, string>([
      ['tests/unit/core/barrel-executes.test.ts', `import { f } from '@czap/core';`],
      ['tests/unit/core/barrel-imports-only.test.ts', `import { other } from '@czap/core';`],
      ['tests/unit/core/deep.test.ts', `import { f } from '../../../packages/core/src/demo-seam.js';`],
    ]);
    const { root, seams } = makeRepo(tests);
    try {
      // The injected batched probe: 'barrel-executes' runs function f (lines 3..5);
      // everyone else executes NO function (empty map → covers nothing). Deterministic
      // by test id.
      const batchedProbe: BatchedSeamCoverageProbe = (_repo, _cfg, seamFiles, testId) => {
        expect(seamFiles).toEqual([SEAM_FILE]);
        const m = new Map<string, readonly LineRange[]>();
        if (testId === 'tests/unit/core/barrel-executes.test.ts') m.set(SEAM_FILE, [{ startLine: 3, endLine: 5 }]);
        return m;
      };

      const { coverage, coveringBySeam } = buildSeamCoverageMap(root, seams, {
        _tag: 'execution',
        options: { repoRoot: root, batchedProbe },
      });

      const at = (line: number): readonly string[] => coverage.covering(SEAM_FILE, line);

      // Line 4 is a FUNCTION-BODY line (inside f's 3..5 range). Only the executing
      // barrel importer + the deep importer cover it — the import-only barrel test is
      // PRUNED (the soundness keystone: it never entered f, so it could never kill a
      // mutant in f).
      expect(at(4)).toEqual(['tests/unit/core/barrel-executes.test.ts', 'tests/unit/core/deep.test.ts']);
      expect(at(4)).not.toContain('tests/unit/core/barrel-imports-only.test.ts');

      // Line 2 is a TOP-LEVEL mutable line (inside NO covered function). The full
      // barrel closure is retained (every barrel importer executes module-init on
      // import) PLUS the deep importer — never under-mapped.
      expect(at(2)).toEqual([
        'tests/unit/core/barrel-executes.test.ts',
        'tests/unit/core/barrel-imports-only.test.ts',
        'tests/unit/core/deep.test.ts',
      ]);

      // Every line is covered by the deep importer (it references the seam source).
      for (let line = 1; line <= SEAM_LINES; line++) {
        expect(at(line)).toContain('tests/unit/core/deep.test.ts');
      }

      // The provenance lists all three (each covers ≥1 line).
      expect(coveringBySeam.get(SEAM_FILE)).toEqual([
        'tests/unit/core/barrel-executes.test.ts',
        'tests/unit/core/barrel-imports-only.test.ts',
        'tests/unit/core/deep.test.ts',
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('DETERMINISM — the same inputs build a byte-identical covering set on every run', () => {
    const tests = new Map<string, string>([
      ['tests/unit/core/a.test.ts', `import { f } from '@czap/core';`],
      ['tests/unit/core/b.test.ts', `import { g } from '@czap/core';`],
    ]);
    const { root, seams } = makeRepo(tests);
    try {
      const batchedProbe: BatchedSeamCoverageProbe = (_repo, _cfg, _seams, testId) => {
        const m = new Map<string, readonly LineRange[]>();
        if (testId === 'tests/unit/core/a.test.ts') m.set(SEAM_FILE, [{ startLine: 3, endLine: 5 }]);
        return m;
      };

      const run = (): readonly string[][] => {
        const { coverage } = buildSeamCoverageMap(root, seams, { _tag: 'execution', options: { repoRoot: root, batchedProbe } });
        return Array.from({ length: SEAM_LINES }, (_v, i) => [...coverage.covering(SEAM_FILE, i + 1)]);
      };
      // Build twice → identical map (the determinism contract the verdict-cache key relies on).
      expect(run()).toEqual(run());
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('relation — a function-body line maps to executing tests, a top-level line to the full barrel set', () => {
    const executions: SeamTestExecution[] = [
      { testId: 'exec.test.ts', seamFile: SEAM_FILE, deepImporter: false, coveredFunctionRanges: [{ startLine: 3, endLine: 5 }] },
      { testId: 'idle.test.ts', seamFile: SEAM_FILE, deepImporter: false, coveredFunctionRanges: [] },
    ];
    const relation = executionCoverageRelation(executions, new Map([[SEAM_FILE, SEAM_LINES]]));
    const map = makeCoverageMap(relation);
    // Function-body line 4 → only the executing test.
    expect(map.covering(SEAM_FILE, 4)).toEqual(['exec.test.ts']);
    // Top-level line 2 → BOTH barrel candidates (sound fallback).
    expect(map.covering(SEAM_FILE, 2)).toEqual(['exec.test.ts', 'idle.test.ts']);
  });

  it('parseCoveredFunctionRanges — reads covered functions, ignores unhit ones, and returns null when the seam is absent', () => {
    const report = JSON.stringify({
      '/abs/packages/core/src/demo-seam.ts': {
        f: { '0': 3, '1': 0 },
        fnMap: {
          '0': { loc: { start: { line: 3 }, end: { line: 5 } } },
          '1': { loc: { start: { line: 10 }, end: { line: 12 } } },
        },
      },
    });
    // Only function 0 (hit count 3) contributes a range; function 1 (0 hits) is dropped.
    expect(parseCoveredFunctionRanges(report, SEAM_FILE)).toEqual([{ startLine: 3, endLine: 5 }]);
    // A report with no entry for the seam → null (the test executed none of it).
    expect(parseCoveredFunctionRanges(JSON.stringify({ '/abs/other.ts': { f: {}, fnMap: {} } }), SEAM_FILE)).toBeNull();
    // A v8 null end-line falls back to the start line (a single-line function), never NaN.
    const nullEnd = JSON.stringify({
      [`/abs/${SEAM_FILE}`]: { f: { '0': 1 }, fnMap: { '0': { loc: { start: { line: 4 }, end: { line: null } } } } },
    });
    expect(parseCoveredFunctionRanges(nullEnd, SEAM_FILE)).toEqual([{ startLine: 4, endLine: 4 }]);
  });

  it('parseBatchedCoveredFunctionRanges — attributes per-seam ranges and OMITS a seam absent from the report (covers nothing)', () => {
    const seamA = 'packages/core/src/hlc.ts';
    const seamB = 'packages/core/src/dag.ts';
    const seamC = 'packages/core/src/content-address.ts';
    const report = JSON.stringify({
      '/abs/packages/core/src/hlc.ts': { f: { '0': 2 }, fnMap: { '0': { loc: { start: { line: 5 }, end: { line: 9 } } } } },
      '/abs/packages/core/src/dag.ts': { f: { '0': 0 }, fnMap: { '0': { loc: { start: { line: 1 }, end: { line: 3 } } } } },
      // content-address.ts is ABSENT — the test executed none of its functions.
    });
    const m = parseBatchedCoveredFunctionRanges(report, [seamA, seamB, seamC]);
    // hlc: function 0 executed → its range.
    expect(m.get(seamA)).toEqual([{ startLine: 5, endLine: 9 }]);
    // dag: present but all functions unhit → empty (covers nothing on function-body lines).
    expect(m.get(seamB)).toEqual([]);
    // content-address: absent → omitted (the caller reads `?? []` = covers nothing).
    expect(m.has(seamC)).toBe(false);
  });
});
