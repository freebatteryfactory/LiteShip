/**
 * The L4-SEAM TARGETING + the SOUND covering-tests map proof (Slice C, the avionics
 * tier — the host half of `liteship check --ir --mutate`). Both computations under test are
 * PURE + DETERMINISTIC over the repo bytes (no clock, no rng, no network), so this proof
 * pins the LAWS, never implementation churn, with an in-memory IR + a throwaway repo dir.
 *
 * THE TARGETING LAW ({@link l4SeamTargets}) — a candidate is mutated ONLY when the LIVE
 * propagated assurance level rates it effective-L4, NEVER a hardcoded assumption. A
 * candidate the propagation does NOT rate L4 is DROPPED + surfaced (`skippedNotL4`); a
 * candidate whose bytes vanished is surfaced (`unreadable`). Both visible, never a quiet
 * drop. This proves the "the map is the source of truth" invariant on both arms:
 *   - a base-L4 candidate (canonical/*, core/hlc) is targeted;
 *   - a base-low candidate (content-address, graph-patch) is SKIPPED when nothing L4
 *     imports it, and PULLED IN when an L4 file imports it (the propagation fixpoint).
 *
 * THE COVERAGE LAW ({@link partitionSeamCandidates} + {@link buildSeamCoverageMap}) — the
 * covering set OVER-APPROXIMATES (a missed covering test is a false survivor, the worst
 * error): a test covers a seam iff it DEEP-imports the seam's `src/F.js` path (precise,
 * always kept) OR imports the seam package's BARREL (`@liteship/P`, the sound broad closure).
 * The partition is a pure function of the seam ids + the on-disk test bytes; the barrel
 * `_tag` mode covers every line; the resulting per-site covering list (and its digest,
 * the verdict-cache key half) is BYTE-STABLE — the determinism the content-addressed
 * mutant id rests on.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeRepoIR, PLACEHOLDER_DIGEST, type RepoIR } from '@liteship/gauntlet';
import { makeCoverageMap, type MutationTargetFile } from '@liteship/audit';
import {
  l4SeamTargets,
  partitionSeamCandidates,
  buildSeamCoverageMap,
} from '../../../../packages/cli/src/lib/mutation-targets.js';

/** Repo-relative seam ids the targeting LAW is exercised against. */
const HLC = 'packages/core/src/clock/hlc.ts'; // base L4 (the clock/hlc glob)
const DAG = 'packages/core/src/graph/dag.ts'; // base L4 (the graph/dag glob)
const CANON_FNV = 'packages/canonical/src/fnv.ts'; // base L4 (canonical/**)
const CONTENT_ADDR = 'packages/core/src/evidence/content-address.ts'; // base LOW — L4 only by propagation
const GRAPH_PATCH = 'packages/core/src/graph/graph-patch.ts'; // base LOW — L4 only by propagation

/** A FileNode for the in-memory IR — the placeholder digest a fixture always uses. */
function fileNode(id: string): { readonly id: string; readonly contentDigest: string; readonly packageName: string } {
  const m = /^packages\/([^/]+)\/src\//.exec(id);
  return { id, contentDigest: PLACEHOLDER_DIGEST, packageName: m === null ? '@liteship/x' : `@liteship/${m[1]}` };
}

/**
 * Build an in-memory IR over the given file ids, with the given internal import edges
 * (`from -> to`). The edges drive the assurance propagation fixpoint — an L4 importer
 * lifts its dependency to L4 (the LAW {@link l4SeamTargets} keys on).
 */
function buildIR(files: readonly string[], edges: readonly (readonly [string, string])[] = []): RepoIR {
  return makeRepoIR({
    files: files.map(fileNode),
    imports: edges.map(([from, to]) => ({
      fromFile: from,
      specifier: `./${to.split('/').pop()?.replace(/\.ts$/, '.js') ?? ''}`,
      kind: 'relative' as const,
      targetFile: to,
    })),
  });
}

/** Write the seam source files into a throwaway repo so their bytes can be read. */
function makeRepoWithSources(sources: ReadonlyMap<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'liteship-mut-targets-'));
  for (const [rel, text] of sources) {
    const abs = join(root, rel);
    mkdirSync(join(abs, '..'), { recursive: true });
    writeFileSync(abs, text, 'utf8');
  }
  return root;
}

/** Write a set of test files into a throwaway repo (under the scanned roots). */
function makeRepoWithTests(tests: ReadonlyMap<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'liteship-mut-targets-'));
  for (const [rel, text] of tests) {
    const abs = join(root, rel);
    mkdirSync(join(abs, '..'), { recursive: true });
    writeFileSync(abs, text, 'utf8');
  }
  return root;
}

describe('l4SeamTargets — the LIVE-propagation targeting LAW (the map is the source of truth)', () => {
  it('targets a base-L4 candidate present on disk, paired with its exact bytes', () => {
    const hlcText = 'export const hlc = () => 0;\n';
    const fnvText = 'export const fnv = () => 1;\n';
    const root = makeRepoWithSources(
      new Map([
        [HLC, hlcText],
        [CANON_FNV, fnvText],
      ]),
    );
    try {
      const ir = buildIR([HLC, CANON_FNV]);
      const result = l4SeamTargets(ir, root);
      const targeted = result.targets.map((t) => t.file);
      // Both are base-L4 (canonical/** and core/hlc) → targeted, never skipped.
      expect(targeted).toContain(HLC);
      expect(targeted).toContain(CANON_FNV);
      // The bytes are the EXACT on-disk source (a byte-faithful read, not a re-encode).
      expect(result.targets.find((t) => t.file === HLC)?.text).toBe(hlcText);
      expect(result.targets.find((t) => t.file === CANON_FNV)?.text).toBe(fnvText);
      expect(result.skippedNotL4).not.toContain(HLC);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('SKIPS a base-low candidate when nothing L4 imports it (surfaced via skippedNotL4, never silently mutated)', () => {
    // content-address.ts / graph-patch.ts are NOT in the L4 glob; with no L4 importer the
    // live propagation leaves them below L4 → the LAW drops them, recorded for the caller.
    const root = makeRepoWithSources(
      new Map([
        [CONTENT_ADDR, 'export const ca = 1;\n'],
        [GRAPH_PATCH, 'export const gp = 1;\n'],
      ]),
    );
    try {
      const ir = buildIR([CONTENT_ADDR, GRAPH_PATCH]);
      const result = l4SeamTargets(ir, root);
      expect(result.targets.map((t) => t.file)).not.toContain(CONTENT_ADDR);
      expect(result.targets.map((t) => t.file)).not.toContain(GRAPH_PATCH);
      // The drop is VISIBLE — surfaced on skippedNotL4, never hidden.
      expect(result.skippedNotL4).toContain(CONTENT_ADDR);
      expect(result.skippedNotL4).toContain(GRAPH_PATCH);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('PULLS IN a base-low candidate once an L4 file imports it (the propagation fixpoint IS the source of truth)', () => {
    // hlc (base L4) imports content-address → propagation lifts content-address to L4 →
    // the SAME candidate that was skipped above is now genuinely on the trust spine.
    const root = makeRepoWithSources(
      new Map([
        [HLC, 'export const hlc = 1;\n'],
        [CONTENT_ADDR, 'export const ca = 1;\n'],
      ]),
    );
    try {
      const ir = buildIR([HLC, CONTENT_ADDR], [[HLC, CONTENT_ADDR]]);
      const result = l4SeamTargets(ir, root);
      // The level was COMPUTED from the live IR, not assumed — content-address is now L4.
      expect(result.targets.map((t) => t.file)).toContain(CONTENT_ADDR);
      expect(result.skippedNotL4).not.toContain(CONTENT_ADDR);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('surfaces an effective-L4 candidate whose bytes cannot be read (a vanished seam → unreadable, never a quiet drop)', () => {
    // HLC is rated L4 by the IR but its file is absent on disk → unreadable, surfaced.
    const root = makeRepoWithSources(new Map([[CANON_FNV, 'export const fnv = 1;\n']]));
    try {
      const ir = buildIR([HLC, CANON_FNV]);
      const result = l4SeamTargets(ir, root);
      expect(result.unreadable).toContain(HLC);
      // It was NOT skipped (it IS L4) and NOT silently dropped from targets.
      expect(result.skippedNotL4).not.toContain(HLC);
      expect(result.targets.map((t) => t.file)).not.toContain(HLC);
      // The readable L4 candidate is still targeted — one vanished seam doesn't sink the run.
      expect(result.targets.map((t) => t.file)).toContain(CANON_FNV);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('is DETERMINISTIC + sorted — the same IR + repo yields an identical, file-id-ordered target list', () => {
    const root = makeRepoWithSources(
      new Map([
        [HLC, 'export const hlc = 1;\n'],
        [DAG, 'export const dag = 1;\n'],
        [CANON_FNV, 'export const fnv = 1;\n'],
      ]),
    );
    try {
      const ir = buildIR([HLC, DAG, CANON_FNV]);
      const first = l4SeamTargets(ir, root);
      const second = l4SeamTargets(ir, root);
      expect(second).toEqual(first);
      // Targets are emitted in sorted candidate order (canonical < core alphabetically).
      const ids = first.targets.map((t) => t.file);
      const sorted = [...ids].sort((a, b) => a.localeCompare(b));
      expect(ids).toEqual(sorted);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('partitionSeamCandidates — the deep-vs-barrel covering partition (sound over-approximation)', () => {
  const SEAM: MutationTargetFile = { file: HLC, text: 'export const hlc = 1;\n' };

  it('classifies a DEEP importer (references the src/F.js path) as a precise deep importer, never a barrel one', () => {
    const root = makeRepoWithTests(
      new Map([['tests/unit/core/deep.test.ts', `import { hlc } from '../../../packages/core/src/clock/hlc.js';`]]),
    );
    try {
      const [seam] = partitionSeamCandidates(root, [SEAM]);
      expect(seam?.deepImporters).toEqual(['tests/unit/core/deep.test.ts']);
      expect(seam?.barrelImporters).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('classifies a BARREL importer (@liteship/core, both quote styles + a /sub path) as a probed candidate', () => {
    const root = makeRepoWithTests(
      new Map([
        ['tests/unit/core/single.test.ts', `import { hlc } from '@liteship/core';`],
        ['tests/unit/core/double.test.ts', `import { hlc } from "@liteship/core";`],
        ['tests/unit/core/sub.test.ts', `import { x } from '@liteship/core/sub';`],
        ['tests/unit/core/unrelated.test.ts', `import { z } from '@liteship/web';`],
      ]),
    );
    try {
      const [seam] = partitionSeamCandidates(root, [SEAM]);
      expect(seam?.deepImporters).toEqual([]);
      // All three @liteship/core importers are barrel candidates; the @liteship/web one is not.
      expect(seam?.barrelImporters.map((b) => b.id)).toEqual([
        'tests/unit/core/double.test.ts',
        'tests/unit/core/single.test.ts',
        'tests/unit/core/sub.test.ts',
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('de-duplicates the corpus across roots and DEEP wins over BARREL when a test does both', () => {
    // A test that BOTH deep-imports and barrel-imports is a deep importer (the precise
    // arm short-circuits the barrel arm — `else if`), never double-counted.
    const root = makeRepoWithTests(
      new Map([
        [
          'tests/unit/core/both.test.ts',
          `import { hlc } from '../../../packages/core/src/clock/hlc.js';\nimport { z } from '@liteship/core';`,
        ],
      ]),
    );
    try {
      const [seam] = partitionSeamCandidates(root, [SEAM]);
      expect(seam?.deepImporters).toEqual(['tests/unit/core/both.test.ts']);
      expect(seam?.barrelImporters).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('a seam with no package barrel (not under packages/P/src) admits only the deep-import signal', () => {
    const noBarrelSeam: MutationTargetFile = { file: 'scripts/tool.ts', text: 'export const t = 1;\n' };
    const root = makeRepoWithTests(
      new Map([
        ['tests/unit/core/barrelish.test.ts', `import { x } from '@liteship/core';`],
        ['tests/unit/core/deep.test.ts', `import { t } from '../../../scripts/tool.js';`],
      ]),
    );
    try {
      const [seam] = partitionSeamCandidates(root, [noBarrelSeam]);
      // No `@liteship/<pkg>` barrel for a scripts/ seam → barrel arm is empty; only the deep
      // importer matches its src path.
      expect(seam?.barrelImporters).toEqual([]);
      expect(seam?.deepImporters).toEqual(['tests/unit/core/deep.test.ts']);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('a repo missing every test root is valid — an empty corpus, not a throw (ENOENT is skipped)', () => {
    const root = mkdtempSync(join(tmpdir(), 'liteship-mut-targets-empty-'));
    try {
      const [seam] = partitionSeamCandidates(root, [SEAM]);
      expect(seam?.deepImporters).toEqual([]);
      expect(seam?.barrelImporters).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('PROPERTY — the partition is a pure function of the corpus: shuffling the on-disk write order never changes the (sorted) result', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.integer({ min: 0, max: 50 }), { minLength: 1, maxLength: 8 }),
        (idxs) => {
          const entries: [string, string][] = idxs.map((i) => [
            `tests/unit/core/t${i}.test.ts`,
            `import { hlc } from '@liteship/core';`,
          ]);
          const buildFrom = (order: [string, string][]): readonly string[] => {
            const root = makeRepoWithTests(new Map(order));
            try {
              const [seam] = partitionSeamCandidates(root, [SEAM]);
              return seam?.barrelImporters.map((b) => b.id) ?? [];
            } finally {
              rmSync(root, { recursive: true, force: true });
            }
          };
          const forward = buildFrom(entries);
          const reversed = buildFrom([...entries].reverse());
          // Same corpus, reversed write order → identical sorted barrel set (determinism).
          expect(reversed).toEqual(forward);
          expect(forward).toEqual([...forward].sort((a, b) => a.localeCompare(b)));
        },
      ),
      { numRuns: 25 },
    );
  });
});

describe('buildSeamCoverageMap — the deterministic SOUND coverage map (barrel mode = the broad closure)', () => {
  const SEAM_TEXT = ['// header', 'export const X = 1;', 'export const Y = 2;'].join('\n');
  const SEAM: MutationTargetFile = { file: HLC, text: SEAM_TEXT };
  const LINES = SEAM_TEXT.split('\n').length;

  it('barrel mode (the default) maps EVERY line to the full deep ∪ barrel closure (sound, broad)', () => {
    const root = makeRepoWithTests(
      new Map([
        ['tests/unit/core/barrel.test.ts', `import { x } from '@liteship/core';`],
        ['tests/unit/core/deep.test.ts', `import { hlc } from '../../../packages/core/src/clock/hlc.js';`],
      ]),
    );
    try {
      // The default mode is { _tag: 'barrel' } — exercise the default-argument path.
      const { coverage, coveringBySeam } = buildSeamCoverageMap(root, [SEAM]);
      for (let line = 1; line <= LINES; line++) {
        // Every line covered by BOTH the deep importer and the barrel importer.
        expect(coverage.covering(HLC, line)).toEqual([
          'tests/unit/core/barrel.test.ts',
          'tests/unit/core/deep.test.ts',
        ]);
      }
      expect(coveringBySeam.get(HLC)).toEqual([
        'tests/unit/core/barrel.test.ts',
        'tests/unit/core/deep.test.ts',
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('a seam with only a deep importer maps every line to that one test; no barrel candidates', () => {
    const root = makeRepoWithTests(
      new Map([['tests/unit/core/deep.test.ts', `import { hlc } from '../../../packages/core/src/clock/hlc.js';`]]),
    );
    try {
      const { coverage, coveringBySeam } = buildSeamCoverageMap(root, [SEAM], { _tag: 'barrel' });
      for (let line = 1; line <= LINES; line++) {
        expect(coverage.covering(HLC, line)).toEqual(['tests/unit/core/deep.test.ts']);
      }
      expect(coveringBySeam.get(HLC)).toEqual(['tests/unit/core/deep.test.ts']);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('an UNCOVERED seam (no deep, no barrel importer) maps to the empty set on every line', () => {
    const root = makeRepoWithTests(
      new Map([['tests/unit/web/unrelated.test.ts', `import { z } from '@liteship/web';`]]),
    );
    try {
      const { coverage, coveringBySeam } = buildSeamCoverageMap(root, [SEAM]);
      for (let line = 1; line <= LINES; line++) {
        expect(coverage.covering(HLC, line)).toEqual([]);
      }
      expect(coveringBySeam.get(HLC)).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('is DETERMINISTIC — the same inputs build a byte-identical covering set (the verdict-cache key LAW)', () => {
    const tests = new Map([
      ['tests/unit/core/a.test.ts', `import { x } from '@liteship/core';`],
      ['tests/unit/core/b.test.ts', `import { hlc } from '../../../packages/core/src/clock/hlc.js';`],
    ]);
    const run = (): readonly string[][] => {
      const root = makeRepoWithTests(new Map(tests));
      try {
        const { coverage } = buildSeamCoverageMap(root, [SEAM]);
        return Array.from({ length: LINES }, (_v, i) => [...coverage.covering(HLC, i + 1)]);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    };
    expect(run()).toEqual(run());
  });

  it('CONTENT-ADDRESSED determinism — the covering relation is order-independent: same set in, same map out', () => {
    // makeCoverageMap de-dups + sorts so the same logical relation yields the SAME map
    // regardless of input order — the determinism the content-addressed mutant id rests
    // on (the cache key half). Pin it directly: forward vs shuffled vs duplicated relation.
    const relation = [
      { file: HLC, line: 2, testId: 'tests/z.test.ts' },
      { file: HLC, line: 2, testId: 'tests/a.test.ts' },
      { file: HLC, line: 3, testId: 'tests/a.test.ts' },
    ];
    const shuffled = [...relation].reverse();
    const withDupes = [...relation, ...relation];
    const a = makeCoverageMap(relation);
    const b = makeCoverageMap(shuffled);
    const c = makeCoverageMap(withDupes);
    // Sorted + de-duplicated, identical across all three orderings.
    expect(a.covering(HLC, 2)).toEqual(['tests/a.test.ts', 'tests/z.test.ts']);
    expect(b.covering(HLC, 2)).toEqual(a.covering(HLC, 2));
    expect(c.covering(HLC, 2)).toEqual(a.covering(HLC, 2));
    expect(c.covering(HLC, 3)).toEqual(['tests/a.test.ts']);
    // A site with no relation entry is NO-COVERAGE (empty), never undefined.
    expect(a.covering(HLC, 99)).toEqual([]);
  });
});
