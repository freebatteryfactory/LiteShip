/**
 * The EXECUTION-COVERAGE map proof (Slice C, the avionics tier — the barrel-problem
 * fix for `liteship check gates --ir --mutate`). The execution filter prunes the ~220 `@liteship/core`
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
 * scoped-v8-coverage probe is proven by the live `liteship check gates --ir --mutate` run.
 *
 * @module
 */
import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * The fields of a `spawnSync` result the two probes classify — a local structural type
 * so this test never imports `node:child_process` (the canonical-spawn-helper lint ban),
 * yet crafts the exact shape the probe reads ({status, signal, error} + stderr).
 */
interface ProbeSpawnResult {
  readonly pid: number;
  readonly status: number | null;
  readonly signal: string | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly output: readonly (string | null)[];
  readonly error?: Error;
}

/**
 * Mock ONLY `node:child_process.spawnSync` — the single host-realm boundary of the two
 * spawn-based probes. Every other call the probes make (`mkdtempSync` for the per-probe
 * reports dir, `existsSync`/`readFileSync` for the report, `rmSync` cleanup) stays on
 * the REAL fs, so the report-read + reports-dir-cleanup branches are exercised for real
 * against a synthetic report the mock writes. No PATH, no shebang shim, no real `pnpm`,
 * no real subprocess — every spawn result is crafted, so each classification branch is
 * exercised deterministically on EVERY OS (the cross-platform-by-construction fix).
 */
const { spawnSyncMock } = vi.hoisted(() => ({
  spawnSyncMock: vi.fn<(cmd: string, args?: readonly string[]) => unknown>(),
}));
vi.mock('node:child_process', async (importOriginal) => {
  const orig = await importOriginal<Record<string, unknown>>();
  return { ...orig, spawnSync: spawnSyncMock };
});
import type { MutationTargetFile } from '../../../../packages/audit/src/index.js';
import { buildSeamCoverageMap } from '../../../../packages/cli/src/lib/mutation-targets.js';
import {
  computeSeamExecutionCoverage,
  executionCoverageRelation,
  parseCoveredFunctionRanges,
  parseBatchedCoveredFunctionRanges,
  defaultCoverageProbe,
  defaultBatchedCoverageProbe,
  makeFsSeamCoverageProbeCache,
  seamLineCount,
  type BatchedSeamCoverageProbe,
  type SeamCoverageProbe,
  type SeamCoverageProbeCache,
  type SeamCandidates,
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
  const root = mkdtempSync(join(tmpdir(), 'liteship-seam-cov-test-'));
  for (const [rel, text] of tests) {
    const abs = join(root, rel);
    mkdirSync(join(abs, '..'), { recursive: true });
    writeFileSync(abs, text, 'utf8');
  }
  return { root, seams: [{ file: SEAM_FILE, text: SEAM_TEXT }] };
}

describe('seam execution coverage — the barrel-problem fix', () => {
  it('SOUNDNESS — excludes a barrel importer that executes no function; keeps the one that does; top-level lines keep the full barrel closure; deep importers cover every line', () => {
    // Three barrel importers of @liteship/core + one deep importer.
    //  - barrel-executes:   imports the barrel AND (per the probe) executes function f.
    //  - barrel-imports-only: imports the barrel but executes NO function of the seam.
    //  - deep:              deep-imports the seam's source path.
    const tests = new Map<string, string>([
      ['tests/unit/core/barrel-executes.test.ts', `import { f } from '@liteship/core';`],
      ['tests/unit/core/barrel-imports-only.test.ts', `import { other } from '@liteship/core';`],
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
      ['tests/unit/core/a.test.ts', `import { f } from '@liteship/core';`],
      ['tests/unit/core/b.test.ts', `import { g } from '@liteship/core';`],
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

  it('parse* — a non-object JSON report (number / null / string) is a tagged throw, never a silent empty', () => {
    // A primitive / null parses but is NOT the `{ [absFile]: entry }` shape; reading it
    // as "no coverage" would under-map → false survivor, so it must throw (`typeof !==
    // 'object' || === null`).
    for (const bad of ['42', 'null', '"a string"']) {
      expect(() => parseCoveredFunctionRanges(bad, SEAM_FILE)).toThrowError(/not a JSON object/);
      expect(() => parseBatchedCoveredFunctionRanges(bad, [SEAM_FILE])).toThrowError(/not a JSON object/);
    }
    // An ARRAY is technically a (typeof) object with no matching seam keys → not a throw:
    // single → null (seam absent); batched → empty map (no seam attributed).
    expect(parseCoveredFunctionRanges('[]', SEAM_FILE)).toBeNull();
    expect(parseBatchedCoveredFunctionRanges('[]', [SEAM_FILE]).size).toBe(0);
  });

  it('parseCoveredFunctionRanges — drops a function whose loc/start line is missing or non-positive (never a NaN range)', () => {
    const report = JSON.stringify({
      [`/abs/${SEAM_FILE}`]: {
        f: { '0': 1, '1': 1, '2': 1, '3': 1 },
        fnMap: {
          '0': { loc: { start: { line: 3 }, end: { line: 5 } } }, // kept
          '1': { loc: { start: { line: 0 }, end: { line: 4 } } }, // start non-positive → dropped
          '2': { loc: { start: { line: 'x' }, end: { line: 4 } } }, // start non-numeric → dropped
          '3': { loc: {} }, // no start → dropped
        },
      },
    });
    expect(parseCoveredFunctionRanges(report, SEAM_FILE)).toEqual([{ startLine: 3, endLine: 5 }]);
  });

  it('parseCoveredFunctionRanges — a non-object file-coverage entry yields an empty range list (defensive, no throw)', () => {
    // The seam key matches by suffix but its value is a primitive — coveredRangesOf
    // returns [] rather than crashing (a present-but-garbage entry covers nothing).
    const report = JSON.stringify({ [`/abs/${SEAM_FILE}`]: 7 });
    expect(parseCoveredFunctionRanges(report, SEAM_FILE)).toEqual([]);
  });

  it('parseCoveredFunctionRanges — sorts the covered ranges deterministically by start then end', () => {
    const report = JSON.stringify({
      [`/abs/${SEAM_FILE}`]: {
        f: { '0': 1, '1': 1, '2': 1 },
        fnMap: {
          '0': { loc: { start: { line: 10 }, end: { line: 12 } } },
          '1': { loc: { start: { line: 3 }, end: { line: 5 } } },
          '2': { loc: { start: { line: 3 }, end: { line: 4 } } },
        },
      },
    });
    expect(parseCoveredFunctionRanges(report, SEAM_FILE)).toEqual([
      { startLine: 3, endLine: 4 },
      { startLine: 3, endLine: 5 },
      { startLine: 10, endLine: 12 },
    ]);
  });
});

describe('seamLineCount — the relation line-bound from the seam bytes', () => {
  it('counts newline-delimited lines (a trailing newline adds an empty final line)', () => {
    expect(seamLineCount({ file: SEAM_FILE, text: SEAM_TEXT })).toBe(SEAM_LINES);
    expect(seamLineCount({ file: 'x', text: '' })).toBe(1); // '' splits to ['']
    expect(seamLineCount({ file: 'x', text: 'a\nb\nc' })).toBe(3);
    expect(seamLineCount({ file: 'x', text: 'a\nb\n' })).toBe(3); // trailing \n → ['a','b','']
  });

  it('property — line count is always 1 + the number of newline bytes', () => {
    fc.assert(
      fc.property(fc.string(), (text) => {
        const newlines = [...text].filter((ch) => ch === '\n').length;
        expect(seamLineCount({ file: 'x', text })).toBe(newlines + 1);
      }),
    );
  });
});

describe('executionCoverageRelation — the per-(file,line,test) substrate', () => {
  it('throws (tagged) when a seam has executions but no line count — a wiring bug surfaces, never silently no-coverages the seam', () => {
    const executions: SeamTestExecution[] = [
      { testId: 't.test.ts', seamFile: SEAM_FILE, deepImporter: true, coveredFunctionRanges: [] },
    ];
    // Empty line-count map → the seam's count is undefined → tagged throw.
    expect(() => executionCoverageRelation(executions, new Map())).toThrowError(/no line count for seam/);
  });

  it('a deep importer covers EVERY line of its seam; an empty execution set yields an empty relation', () => {
    const deep: SeamTestExecution[] = [
      { testId: 'deep.test.ts', seamFile: SEAM_FILE, deepImporter: true, coveredFunctionRanges: [] },
    ];
    const rel = executionCoverageRelation(deep, new Map([[SEAM_FILE, SEAM_LINES]]));
    // One (file,line,test) per line for the deep importer.
    expect(rel).toHaveLength(SEAM_LINES);
    for (let line = 1; line <= SEAM_LINES; line++) {
      expect(rel).toContainEqual({ file: SEAM_FILE, line, testId: 'deep.test.ts' });
    }
    // No executions at all → no relation rows.
    expect(executionCoverageRelation([], new Map())).toEqual([]);
  });

  it('multiple executing barrel importers on the same function-body line are BOTH kept; only line-containing ones', () => {
    const executions: SeamTestExecution[] = [
      { testId: 'a.test.ts', seamFile: SEAM_FILE, deepImporter: false, coveredFunctionRanges: [{ startLine: 3, endLine: 5 }] },
      { testId: 'b.test.ts', seamFile: SEAM_FILE, deepImporter: false, coveredFunctionRanges: [{ startLine: 4, endLine: 4 }] },
    ];
    const map = makeCoverageMap(executionCoverageRelation(executions, new Map([[SEAM_FILE, SEAM_LINES]])));
    // Line 4 is inside BOTH ranges → both kept.
    expect(map.covering(SEAM_FILE, 4)).toEqual(['a.test.ts', 'b.test.ts']);
    // Line 3 is inside a's range only (a function-body line covered by ≥1 fn) → only a.
    expect(map.covering(SEAM_FILE, 3)).toEqual(['a.test.ts']);
    // Line 2 is top-level (inside no covered fn of any test) → full barrel closure (both).
    expect(map.covering(SEAM_FILE, 2)).toEqual(['a.test.ts', 'b.test.ts']);
  });
});

/** A seam-candidates fixture: `seam` with the given deep + barrel candidate ids/text. */
function candidatesFor(opts: {
  readonly seam?: string;
  readonly deep?: readonly string[];
  readonly barrel?: readonly { id: string; text: string }[];
}): SeamCandidates {
  return {
    seamFile: opts.seam ?? SEAM_FILE,
    seamText: SEAM_TEXT,
    deepImporters: opts.deep ?? [],
    barrelImporters: opts.barrel ?? [],
  };
}

describe('computeSeamExecutionCoverage — the execution filter (deep kept verbatim, barrel probed, batched per test)', () => {
  it('deep importers are kept WITHOUT a probe; barrel importers are probed once per test for all their seams', () => {
    let probeCalls = 0;
    const seamA = 'packages/core/src/a.ts';
    const seamB = 'packages/core/src/b.ts';
    // Test `shared` is a barrel candidate for BOTH seams → must be probed ONCE with both.
    const candidates: SeamCandidates[] = [
      { seamFile: seamA, seamText: 'A', deepImporters: ['deepA.test.ts'], barrelImporters: [{ id: 'shared.test.ts', text: 'sA' }] },
      { seamFile: seamB, seamText: 'B', deepImporters: [], barrelImporters: [{ id: 'shared.test.ts', text: 'sB' }] },
    ];
    const batchedProbe: BatchedSeamCoverageProbe = (_r, _c, seamFiles, testId) => {
      probeCalls++;
      expect(testId).toBe('shared.test.ts');
      // Batched: BOTH seams probed in one subprocess (the tractability keystone).
      expect([...seamFiles].sort()).toEqual([seamA, seamB]);
      return new Map<string, readonly LineRange[]>([[seamA, [{ startLine: 1, endLine: 2 }]]]); // executes a fn of A, none of B
    };

    const out = computeSeamExecutionCoverage(candidates, { repoRoot: '/repo', batchedProbe });

    // Exactly ONE probe (the shared test batched over both seams), not one per (test,seam).
    expect(probeCalls).toBe(1);
    // Deep importer kept verbatim (deepImporter:true, no ranges).
    expect(out).toContainEqual({ testId: 'deepA.test.ts', seamFile: seamA, deepImporter: true, coveredFunctionRanges: [] });
    // Barrel probe ranges flow through for seam A (executed a fn) and seam B (none → []).
    expect(out).toContainEqual({ testId: 'shared.test.ts', seamFile: seamA, deepImporter: false, coveredFunctionRanges: [{ startLine: 1, endLine: 2 }] });
    expect(out).toContainEqual({ testId: 'shared.test.ts', seamFile: seamB, deepImporter: false, coveredFunctionRanges: [] });
    // Deterministic order: by seam, then by test id.
    const ordered = [...out].sort((x, y) => x.seamFile.localeCompare(y.seamFile) || x.testId.localeCompare(y.testId));
    expect(out).toEqual(ordered);
  });

  it('a barrel seam ABSENT from the probe map maps to [] (covers nothing) — the sound exclusion', () => {
    const batchedProbe: BatchedSeamCoverageProbe = () => new Map(); // executes nothing
    const out = computeSeamExecutionCoverage(
      [candidatesFor({ barrel: [{ id: 'idle.test.ts', text: 't' }] })],
      { repoRoot: '/repo', batchedProbe },
    );
    expect(out).toEqual([{ testId: 'idle.test.ts', seamFile: SEAM_FILE, deepImporter: false, coveredFunctionRanges: [] }]);
  });

  it('no barrel candidates → no probe runs at all (the default probe is never reached)', () => {
    // With only deep importers and the DEFAULT (real-spawn) batched probe, no subprocess
    // is spawned because the uncached set is empty — proven by it not throwing/hanging.
    const out = computeSeamExecutionCoverage([candidatesFor({ deep: ['d1.test.ts', 'd2.test.ts'] })], {
      repoRoot: '/nonexistent-repo',
    });
    expect(out).toEqual([
      { testId: 'd1.test.ts', seamFile: SEAM_FILE, deepImporter: true, coveredFunctionRanges: [] },
      { testId: 'd2.test.ts', seamFile: SEAM_FILE, deepImporter: true, coveredFunctionRanges: [] },
    ]);
  });

  describe('the B2 probe cache — a HIT serves prior ranges (no re-probe); a MISS probes + writes; gated on the toolchain digest', () => {
    /** An in-memory cache that records reads + writes for assertion. */
    function memCache(seed?: ReadonlyMap<string, readonly LineRange[]>): {
      cache: SeamCoverageProbeCache;
      reads: string[];
      writes: { key: string; ranges: readonly LineRange[] }[];
    } {
      const store = new Map<string, readonly LineRange[]>(seed);
      const reads: string[] = [];
      const writes: { key: string; ranges: readonly LineRange[] }[] = [];
      return {
        reads,
        writes,
        cache: {
          read(key) {
            reads.push(key);
            return store.get(key) ?? null;
          },
          write(key, ranges) {
            writes.push({ key, ranges });
            store.set(key, ranges);
          },
        },
      };
    }

    it('a cold cache MISS runs the probe and WRITES the result; a warm run serves the HIT without re-probing', () => {
      const { cache, writes } = memCache();
      let probeCalls = 0;
      const batchedProbe: BatchedSeamCoverageProbe = (_r, _c, seamFiles) => {
        probeCalls++;
        return new Map(seamFiles.map((s) => [s, [{ startLine: 3, endLine: 5 }]] as const));
      };
      const cands = [candidatesFor({ barrel: [{ id: 'b.test.ts', text: 'tt' }] })];
      const opts = { repoRoot: '/repo', batchedProbe, cache, toolchainDigest: 'tc-1' } as const;

      const first = computeSeamExecutionCoverage(cands, opts);
      expect(probeCalls).toBe(1); // cold → probed
      expect(writes).toHaveLength(1); // result cached
      expect(first[0].coveredFunctionRanges).toEqual([{ startLine: 3, endLine: 5 }]);

      const second = computeSeamExecutionCoverage(cands, opts);
      expect(probeCalls).toBe(1); // warm → served from cache, NO second probe
      expect(second).toEqual(first); // byte-identical decision
    });

    it('WITHOUT a toolchain digest the cache is NEVER consulted (no key is built — the anti-lie keystone)', () => {
      const { cache, reads, writes } = memCache();
      const batchedProbe: BatchedSeamCoverageProbe = (_r, _c, seamFiles) =>
        new Map(seamFiles.map((s) => [s, []] as const));
      // cache supplied but toolchainDigest omitted → cacheKeyFor returns null → cache skipped.
      computeSeamExecutionCoverage([candidatesFor({ barrel: [{ id: 'b.test.ts', text: 't' }] })], {
        repoRoot: '/repo',
        batchedProbe,
        cache,
      });
      expect(reads).toEqual([]);
      expect(writes).toEqual([]);
    });

    it('the cache key flips when the toolchain digest changes → a re-probe (the digest is part of the key)', () => {
      const seed = memCache();
      let probeCalls = 0;
      const batchedProbe: BatchedSeamCoverageProbe = (_r, _c, seamFiles) => {
        probeCalls++;
        return new Map(seamFiles.map((s) => [s, []] as const));
      };
      const cands = [candidatesFor({ barrel: [{ id: 'b.test.ts', text: 't' }] })];
      computeSeamExecutionCoverage(cands, { repoRoot: '/r', batchedProbe, cache: seed.cache, toolchainDigest: 'tc-1' });
      computeSeamExecutionCoverage(cands, { repoRoot: '/r', batchedProbe, cache: seed.cache, toolchainDigest: 'tc-2' });
      // Different toolchain digest ⇒ different key ⇒ a fresh probe (no stale serve).
      expect(probeCalls).toBe(2);
    });
  });
});

/**
 * Drive the REAL spawn-based probes deterministically with SYNTHETIC `spawnSync`
 * results — `node:child_process.spawnSync` is mocked (top of file), so every branch of
 * the result-classification (signal-kill → tagged throw, spawn-error → tagged throw,
 * non-{0,1} exit → tagged throw, exit-0-with-report → ranges, exit-1 → still a valid
 * execution signal, no-report → tagged throw, seam-absent → null, reports-dir cleanup)
 * is exercised with a crafted `{status, signal, error}` + a controlled report on every
 * OS. NO PATH, NO shebang, NO fake executable, NO real subprocess — platform-independent
 * by construction (the prior fake-pnpm-on-PATH shim was unix-only and diverged on
 * macos/windows). The report file (when written) goes onto the REAL fs in the probe's
 * own mkdtemp reports dir, so the report-read + reports-dir-cleanup branches stay real.
 */
describe('default(Batched)CoverageProbe — the real spawn glue, driven by a synthetic spawnSync', () => {
  // An arbitrary repo root — never read (spawnSync is mocked, so cwd is inert).
  const repoRoot = '/repo';
  // No mockReset between tests — each test re-arms `spawnSync` via armSpawn (a fresh
  // mockImplementation fully overrides the prior one; resetting a mocked module export
  // would detach the binding from the loaded module).

  /** The `--coverage.reportsDirectory=<dir>` the probe computed, recovered from the spawn args (or null if absent). */
  function reportsDirOf(args: readonly string[]): string | null {
    const flag = args.find((a) => a.startsWith('--coverage.reportsDirectory='));
    return flag === undefined ? null : flag.slice('--coverage.reportsDirectory='.length);
  }

  /** Build a crafted spawn result (the fields the probe classifies). */
  function spawnResult(over: Partial<ProbeSpawnResult>): ProbeSpawnResult {
    return { pid: 1, output: [], stdout: '', stderr: '', status: 0, signal: null, ...over };
  }

  /** A v8/istanbul report mapping `seam` to one covered function on lines 3..5. */
  function coveredReport(seam: string): string {
    return JSON.stringify({ [`/abs/${seam}`]: { f: { '0': 2 }, fnMap: { '0': { loc: { start: { line: 3 }, end: { line: 5 } } } } } });
  }

  /**
   * Arm `spawnSync` to (optionally) write `reportJson` into the probe's reports dir and
   * return a crafted result. `onReportsDir` lets a caller observe the real reports dir
   * the probe created (for the cleanup assertion).
   */
  function armSpawn(opts: {
    readonly result: Partial<ProbeSpawnResult>;
    readonly reportJson?: string;
    readonly onReportsDir?: (dir: string) => void;
  }): void {
    spawnSyncMock.mockImplementation((_cmd, argsUnknown) => {
      const args = (argsUnknown ?? []) as readonly string[];
      const dir = reportsDirOf(args);
      // Only act on the probe's OWN spawn (the one carrying the reports-dir flag); any
      // unrelated spawnSync call in the loaded graph gets a benign empty result.
      if (dir === null) return spawnResult({ status: 0 });
      opts.onReportsDir?.(dir);
      if (opts.reportJson !== undefined) writeFileSync(join(dir, 'coverage-final.json'), opts.reportJson, 'utf8');
      return spawnResult(opts.result);
    });
  }

  it('single probe — exit 0 with a written report returns the covered-function ranges', () => {
    armSpawn({ result: { status: 0 }, reportJson: coveredReport(SEAM_FILE) });
    const ranges = defaultCoverageProbe(repoRoot, 'vitest.config.ts', SEAM_FILE, 't.test.ts', 60_000);
    expect(ranges).toEqual([{ startLine: 3, endLine: 5 }]);
  });

  it('single probe — exit 1 (a FAILING covering test) is still a valid execution signal, not an abort', () => {
    // status 1 = a test-failure exit, NOT a fault — the report still classifies into ranges.
    armSpawn({ result: { status: 1 }, reportJson: coveredReport(SEAM_FILE) });
    const ranges = defaultCoverageProbe(repoRoot, 'vitest.config.ts', SEAM_FILE, 't.test.ts', 60_000);
    expect(ranges).toEqual([{ startLine: 3, endLine: 5 }]);
  });

  it('single probe — a non-{0,1} exit code is a tagged infra/config-fault throw (never a "covers nothing")', () => {
    armSpawn({ result: { status: 2, stderr: 'boom' } });
    expect(() => defaultCoverageProbe(repoRoot, 'vitest.config.ts', SEAM_FILE, 't.test.ts', 60_000)).toThrowError(
      /neither pass=0 nor test-failure=1/,
    );
  });

  it('single probe — exit 0 but NO coverage-final.json written is a tagged throw (refusing to under-map)', () => {
    armSpawn({ result: { status: 0 } }); // no reportJson → nothing written
    expect(() => defaultCoverageProbe(repoRoot, 'vitest.config.ts', SEAM_FILE, 't.test.ts', 60_000)).toThrowError(
      /wrote NO coverage-final\.json/,
    );
  });

  it('single probe — a spawn fault (result.error set) is a tagged throw, never a silent verdict', () => {
    // A crafted spawn error (e.g. the launcher binary is unresolvable) — the same shape
    // spawnSync returns on ENOENT, but synthetic so it never depends on PATH resolution.
    armSpawn({ result: { status: null, error: Object.assign(new Error('spawn ENOENT'), { code: 'ENOENT' }) } });
    expect(() => defaultCoverageProbe(repoRoot, 'vitest.config.ts', SEAM_FILE, 't.test.ts', 60_000)).toThrowError(
      /failed to spawn/,
    );
  });

  it('single probe — a signal kill (result.signal != null, no spawn error) is a tagged throw', () => {
    // The crafted result mimics a probe killed by the timeout: a signal, no spawn error.
    armSpawn({ result: { status: null, signal: 'SIGKILL' } });
    expect(() => defaultCoverageProbe(repoRoot, 'vitest.config.ts', SEAM_FILE, 't.test.ts', 60_000)).toThrowError(
      /killed by signal/,
    );
  });

  it('single probe — when the seam is ABSENT from the written report, returns null (covers nothing)', () => {
    armSpawn({ result: { status: 0 }, reportJson: coveredReport('packages/core/src/other.ts') }); // a DIFFERENT file
    const ranges = defaultCoverageProbe(repoRoot, 'vitest.config.ts', SEAM_FILE, 't.test.ts', 60_000);
    expect(ranges).toBeNull();
  });

  it('single probe — the per-probe reports directory is removed after the run (no temp leak)', () => {
    // Observe the REAL reports dir the probe created, then assert the finally{ rmSync } removed it.
    let reportsDir = '';
    armSpawn({
      result: { status: 0 },
      reportJson: JSON.stringify({ [`/abs/${SEAM_FILE}`]: { f: {}, fnMap: {} } }),
      onReportsDir: (dir) => (reportsDir = dir),
    });
    defaultCoverageProbe(repoRoot, 'vitest.config.ts', SEAM_FILE, 't.test.ts', 60_000);
    expect(reportsDir).not.toBe('');
    expect(existsSync(reportsDir)).toBe(false); // the finally{ rmSync } cleaned it up
  });

  it('batched probe — exit 0 returns the per-seam map; a non-{0,1} exit throws tagged', () => {
    const seamA = 'packages/core/src/a.ts';
    const seamB = 'packages/core/src/b.ts';
    armSpawn({
      result: { status: 0 },
      reportJson: JSON.stringify({
        [`/abs/${seamA}`]: { f: { '0': 1 }, fnMap: { '0': { loc: { start: { line: 1 }, end: { line: 2 } } } } },
        // seamB ABSENT from the report → covers nothing.
      }),
    });
    const m = defaultBatchedCoverageProbe(repoRoot, 'vitest.config.ts', [seamA, seamB], 't.test.ts', 60_000);
    expect(m.get(seamA)).toEqual([{ startLine: 1, endLine: 2 }]);
    expect(m.has(seamB)).toBe(false); // absent → covers nothing

    armSpawn({ result: { status: 3 } });
    expect(() =>
      defaultBatchedCoverageProbe(repoRoot, 'vitest.config.ts', [seamA, seamB], 't.test.ts', 60_000),
    ).toThrowError(/neither pass=0 nor test-failure=1/);
  });

  it('batched probe — exit 0 but NO report is a tagged throw; a spawn fault is a tagged throw', () => {
    armSpawn({ result: { status: 0 } }); // no report written
    expect(() =>
      defaultBatchedCoverageProbe(repoRoot, 'vitest.config.ts', [SEAM_FILE], 't.test.ts', 60_000),
    ).toThrowError(/wrote NO coverage-final\.json/);

    armSpawn({ result: { status: null, error: Object.assign(new Error('spawn ENOENT'), { code: 'ENOENT' }) } });
    expect(() =>
      defaultBatchedCoverageProbe(repoRoot, 'vitest.config.ts', [SEAM_FILE], 't.test.ts', 60_000),
    ).toThrowError(/failed to spawn/);
  });

  it('batched probe — a signal kill (no spawn error) is a tagged throw', () => {
    armSpawn({ result: { status: null, signal: 'SIGKILL' } });
    expect(() =>
      defaultBatchedCoverageProbe(repoRoot, 'vitest.config.ts', [SEAM_FILE], 't.test.ts', 60_000),
    ).toThrowError(/killed by signal/);
  });

  it('the default single probe is wired as the injectable SeamCoverageProbe type', () => {
    // A compile-and-identity check that defaultCoverageProbe satisfies the injection type.
    const asType: SeamCoverageProbe = defaultCoverageProbe;
    expect(asType).toBe(defaultCoverageProbe);
  });
});

describe('makeFsSeamCoverageProbeCache — the fs-backed B2 probe store (atomic write, sound-MISS reads)', () => {
  /** The single `.json` entry in `cacheDir` (the content-addressed probe file). */
  function onlyJsonFile(cacheDir: string): string {
    const jsons = readdirSync(cacheDir).filter((f) => f.endsWith('.json'));
    expect(jsons).toHaveLength(1); // exactly one cached entry under test
    return join(cacheDir, jsons[0]);
  }

  it('round-trips ranges: write then read returns the same ranges (content-addressed key → stable path)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'liteship-fs-cache-'));
    try {
      const cache = makeFsSeamCoverageProbeCache(dir);
      const key = 'seamdigAtestdigBtctc1';
      const ranges: LineRange[] = [{ startLine: 3, endLine: 5 }, { startLine: 10, endLine: 12 }];
      expect(cache.read(key)).toBeNull(); // cold → MISS
      cache.write(key, ranges);
      expect(cache.read(key)).toEqual(ranges); // warm → HIT round-trips
      // A different key is a MISS (distinct content-addressed slug).
      expect(cache.read('seamdigAtestdigBtctc2')).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('an empty ranges list (covers nothing) round-trips as [] — distinct from a MISS (null)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'liteship-fs-cache-'));
    try {
      const cache = makeFsSeamCoverageProbeCache(dir);
      cache.write('k', []);
      expect(cache.read('k')).toEqual([]); // present-but-empty ≠ absent
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('a write is ATOMIC — no .tmp file is left behind after a successful write', () => {
    const dir = mkdtempSync(join(tmpdir(), 'liteship-fs-cache-'));
    try {
      const cache = makeFsSeamCoverageProbeCache(dir);
      cache.write('k', [{ startLine: 1, endLine: 1 }]);
      const cacheDir = join(dir, '.liteship', 'cache', 'seam-coverage');
      const leftovers = readdirSync(cacheDir).filter((f) => f.endsWith('.tmp'));
      expect(leftovers).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('a malformed/hand-edited cache file is a sound MISS (null), never a partial/garbage decision', () => {
    const dir = mkdtempSync(join(tmpdir(), 'liteship-fs-cache-'));
    try {
      const cache = makeFsSeamCoverageProbeCache(dir);
      const key = 'k';
      // Seed a real entry, then corrupt the on-disk file with several malformed shapes.
      cache.write(key, [{ startLine: 1, endLine: 2 }]);
      const file = onlyJsonFile(join(dir, '.liteship', 'cache', 'seam-coverage'));
      for (const garbage of [
        'not json{',                                   // invalid JSON → SyntaxError → null
        '{"not":"an array"}',                          // not an array → null
        '[42]',                                        // element not an object → null
        '[{"startLine":2,"endLine":1}]',               // endLine < startLine → null
        '[{"startLine":0,"endLine":3}]',               // non-positive line → null
        '[{"startLine":1.5,"endLine":3}]',             // non-integer line → null
        'null',                                        // JSON null, not an array → null
      ]) {
        writeFileSync(file, garbage, 'utf8');
        expect(cache.read(key)).toBeNull();
      }
      // A WELL-FORMED file still reads back correctly (the MISS is specific to garbage).
      writeFileSync(file, JSON.stringify([{ startLine: 4, endLine: 9 }]), 'utf8');
      expect(cache.read(key)).toEqual([{ startLine: 4, endLine: 9 }]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('reading an absent key (no file) is a MISS (null), never a throw', () => {
    const dir = mkdtempSync(join(tmpdir(), 'liteship-fs-cache-'));
    try {
      expect(makeFsSeamCoverageProbeCache(dir).read('never-written')).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('a directory at the cache path (EISDIR on read) is a sound MISS, not a throw', () => {
    const dir = mkdtempSync(join(tmpdir(), 'liteship-fs-cache-'));
    try {
      const cache = makeFsSeamCoverageProbeCache(dir);
      // Write a real entry to learn the on-disk file path, then replace the FILE with a DIR.
      const key = 'eisdir-key';
      cache.write(key, [{ startLine: 1, endLine: 1 }]);
      const file = onlyJsonFile(join(dir, '.liteship', 'cache', 'seam-coverage'));
      rmSync(file, { force: true });
      mkdirSync(file); // now reading `file` as a regular file fails EISDIR
      expect(cache.read(key)).toBeNull(); // the typed-ENOENT/EISDIR/EACCES/EPERM guard → MISS
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
