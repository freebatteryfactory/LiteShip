/**
 * The HOST builders for the LOCAL-VS-GLOBAL correctness family — the proof-signal
 * blend + the deterministic interaction-edge derivation. This suite proves the
 * builders are PURE + DETERMINISTIC over the repo bytes + the IR, that the blend is
 * the documented weighted combination, and that the composition-coverage classifier
 * is the SOUND static over-approximation (a covered edge requires a test touching BOTH
 * endpoints; an uncovered edge is reported).
 *
 * The fixture is a hermetic tmp repo: a committed mutation-score baseline + a coverage
 * report + an invariants ledger + a tiny test corpus, plus a literal in-memory IR. No
 * clock, no network — same bytes → byte-identical facts.
 *
 * @module
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import fc from 'fast-check';
import { hasTag } from '@czap/error';
import { makeRepoIR, PLACEHOLDER_DIGEST, type RepoIR } from '@czap/gauntlet';
import {
  buildProofFacts,
  buildCompositionFacts,
  blendProof,
  PROOF_BLEND_WEIGHTS,
} from '../../../../packages/cli/src/lib/local-vs-global.js';

const A = 'packages/core/src/a.ts';
const B = 'packages/core/src/b.ts';

let repoRoot: string;

/** The fixture IR: A imports B (a dep + interaction edge). */
function fixtureIR(): RepoIR {
  return makeRepoIR({
    files: [
      { id: A, contentDigest: PLACEHOLDER_DIGEST, packageName: '@czap/core' },
      { id: B, contentDigest: PLACEHOLDER_DIGEST, packageName: '@czap/core' },
    ],
    imports: [{ fromFile: A, specifier: './b.js', kind: 'relative', targetFile: B }],
  });
}

beforeAll(() => {
  repoRoot = mkdtempSync(join(tmpdir(), 'czap-lvg-'));
  mkdirSync(join(repoRoot, 'benchmarks'), { recursive: true });
  mkdirSync(join(repoRoot, 'coverage'), { recursive: true });
  mkdirSync(join(repoRoot, 'traceability'), { recursive: true });
  mkdirSync(join(repoRoot, 'tests/unit'), { recursive: true });
  mkdirSync(join(repoRoot, 'tests/integration'), { recursive: true });

  // A: strongly proven (mutation 1.0, coverage 1.0); B: weakly proven (mutation 0.2,
  // coverage ~0.33).
  writeFileSync(
    join(repoRoot, 'benchmarks/mutation-score.json'),
    JSON.stringify({ [A]: 1, [B]: 0.2 }),
  );
  writeFileSync(
    join(repoRoot, 'coverage/coverage-final.json'),
    JSON.stringify({
      [join(repoRoot, A)]: { s: { 0: 5, 1: 3, 2: 1 } }, // 3/3 covered = 1.0
      [join(repoRoot, B)]: { s: { 0: 1, 1: 0, 2: 0 } }, // 1/3 covered ≈ 0.333
    }),
  );
  writeFileSync(
    join(repoRoot, 'traceability/invariants.yaml'),
    'invariants:\n  - id: INV-A-LAW\n    law: "A holds."\n    level: L4\n    category: meta\n',
  );

  // A unit test deep-imports A and PROVES INV-A-LAW + uses fast-check (property test).
  writeFileSync(
    join(repoRoot, 'tests/unit/a.test.ts'),
    `import { a } from '${A.replace(/\.ts$/, '.js')}';\nimport fc from 'fast-check';\n// PROVES: INV-A-LAW\nfc.assert(() => a());\n`,
  );
  // A unit test deep-imports B only (B is individually tested, but no test touches A+B).
  writeFileSync(
    join(repoRoot, 'tests/unit/b.test.ts'),
    `import { b } from '${B.replace(/\.ts$/, '.js')}';\nb();\n`,
  );
});

afterAll(() => {
  rmSync(repoRoot, { recursive: true, force: true });
});

describe('blendProof — the documented weighted combination', () => {
  it('blends the four signals by the redlinable weights, in [0, 1]', () => {
    const full = blendProof({ mutationScore: 1, coverage: 1, hasPropertyTest: true, hasEnrolledInvariant: true });
    expect(full).toBeCloseTo(1); // weights sum to 1
    const onlyMutation = blendProof({ mutationScore: 1, coverage: null, hasPropertyTest: false, hasEnrolledInvariant: false });
    expect(onlyMutation).toBeCloseTo(PROOF_BLEND_WEIGHTS.mutation);
    // An unmeasured fraction (null) contributes 0 — the sound direction.
    const none = blendProof({ mutationScore: null, coverage: null, hasPropertyTest: false, hasEnrolledInvariant: false });
    expect(none).toBe(0);
  });
});

describe('buildProofFacts — reads the real signals, deterministic', () => {
  it('builds one ModuleProof per IR file with the blended scalar + signal breakdown', () => {
    const ir = fixtureIR();
    const facts = buildProofFacts(repoRoot, ir);
    expect(facts.modules).toHaveLength(2);
    const a = facts.modules!.find((m) => m.file === A)!;
    const b = facts.modules!.find((m) => m.file === B)!;
    // A: mutation 1.0, coverage 1.0, property-test yes, enrolled-invariant yes → blend 1.0.
    expect(a.signals.mutationScore).toBe(1);
    expect(a.signals.coverage).toBeCloseTo(1);
    expect(a.signals.hasPropertyTest).toBe(true);
    expect(a.signals.hasEnrolledInvariant).toBe(true);
    expect(a.localProof).toBeCloseTo(1);
    // B: mutation 0.2, coverage ~0.333, no property test, no invariant → a weak scalar.
    expect(b.signals.mutationScore).toBe(0.2);
    expect(b.signals.coverage).toBeCloseTo(1 / 3, 2);
    expect(b.signals.hasPropertyTest).toBe(false);
    expect(b.signals.hasEnrolledInvariant).toBe(false);
    expect(b.localProof).toBeLessThan(0.3);
  });

  it('is DETERMINISTIC — the same repo + IR yields byte-identical facts twice', () => {
    const ir = fixtureIR();
    expect(JSON.stringify(buildProofFacts(repoRoot, ir))).toBe(JSON.stringify(buildProofFacts(repoRoot, ir)));
  });
});

describe('buildCompositionFacts — the sound static-reference proxy', () => {
  it('reports the A→B edge as UNCOVERED (both tested, no test touches both)', () => {
    const ir = fixtureIR();
    const facts = buildCompositionFacts(repoRoot, ir);
    expect(facts.edges).toHaveLength(1);
    const e = facts.edges![0]!;
    expect(e.fromFile).toBe(A);
    expect(e.toFile).toBe(B);
    expect(e.integrationCovered).toBe(false);
    expect(e.evidence._tag).toBe('none');
  });

  it('marks the edge COVERED once a single test references BOTH endpoints', () => {
    // Add an integration test that deep-imports BOTH A and B → the edge is covered
    // (static-reference). This proves the proxy suppresses the finding only when at
    // least one test touches both.
    writeFileSync(
      join(repoRoot, 'tests/integration/ab.test.ts'),
      `import { a } from '${A.replace(/\.ts$/, '.js')}';\nimport { b } from '${B.replace(/\.ts$/, '.js')}';\na(); b();\n`,
    );
    const facts = buildCompositionFacts(repoRoot, fixtureIR());
    const e = facts.edges![0]!;
    expect(e.integrationCovered).toBe(true);
    expect(e.evidence._tag).toBe('static-reference');
  });

  it('is DETERMINISTIC — the same repo + IR yields byte-identical facts twice', () => {
    const ir = fixtureIR();
    expect(JSON.stringify(buildCompositionFacts(repoRoot, ir))).toBe(JSON.stringify(buildCompositionFacts(repoRoot, ir)));
  });
});

describe('blendProof — the LAW is monotone + bounded (property-based)', () => {
  it('is in [0, 1] for ALL signal combinations, and weights are the only multipliers', () => {
    fc.assert(
      fc.property(
        fc.option(fc.double({ min: 0, max: 1, noNaN: true }), { nil: null }),
        fc.option(fc.double({ min: 0, max: 1, noNaN: true }), { nil: null }),
        fc.boolean(),
        fc.boolean(),
        (mutationScore, coverage, hasPropertyTest, hasEnrolledInvariant) => {
          const blended = blendProof({ mutationScore, coverage, hasPropertyTest, hasEnrolledInvariant });
          expect(blended).toBeGreaterThanOrEqual(0);
          expect(blended).toBeLessThanOrEqual(1);
          // The blend is EXACTLY the documented weighted sum (no hidden term).
          const expected =
            (mutationScore ?? 0) * PROOF_BLEND_WEIGHTS.mutation +
            (coverage ?? 0) * PROOF_BLEND_WEIGHTS.coverage +
            (hasPropertyTest ? PROOF_BLEND_WEIGHTS.property : 0) +
            (hasEnrolledInvariant ? PROOF_BLEND_WEIGHTS.invariant : 0);
          expect(blended).toBeCloseTo(expected, 10);
        },
      ),
    );
  });

  it('a missing measurement (null) NEVER raises proof vs. a measured 0 — the sound direction', () => {
    fc.assert(
      fc.property(fc.boolean(), fc.boolean(), (p, i) => {
        const withNull = blendProof({ mutationScore: null, coverage: null, hasPropertyTest: p, hasEnrolledInvariant: i });
        const withZero = blendProof({ mutationScore: 0, coverage: 0, hasPropertyTest: p, hasEnrolledInvariant: i });
        // null contributes 0 exactly as a measured 0 does (never an inflated bonus).
        expect(withNull).toBeCloseTo(withZero, 10);
      }),
    );
  });

  it('the four weights sum to exactly 1, so the scalar is genuinely normalized', () => {
    const sum =
      PROOF_BLEND_WEIGHTS.mutation +
      PROOF_BLEND_WEIGHTS.coverage +
      PROOF_BLEND_WEIGHTS.property +
      PROOF_BLEND_WEIGHTS.invariant;
    expect(sum).toBeCloseTo(1, 10);
  });
});

describe('buildProofFacts — the ABSENT-artifact + unmeasured-module arms (the sound fallthrough)', () => {
  let bare: string;
  beforeAll(() => {
    // A repo with NO mutation baseline, NO coverage report, NO invariants ledger, and
    // NO test corpus — every signal is UNMEASURED → every module's localProof is 0.
    bare = mkdtempSync(join(tmpdir(), 'czap-lvg-bare-'));
    mkdirSync(join(bare, 'tests/unit'), { recursive: true });
  });
  afterAll(() => {
    rmSync(bare, { recursive: true, force: true });
  });

  it('with no committed artifacts at all, every module is UNMEASURED → localProof 0', () => {
    const ir = fixtureIR();
    const facts = buildProofFacts(bare, ir);
    expect(facts.modules).toHaveLength(2);
    for (const m of facts.modules!) {
      // mutation/coverage both null (no artifact), no property test, no invariant.
      expect(m.signals.mutationScore).toBeNull();
      expect(m.signals.coverage).toBeNull();
      expect(m.signals.hasPropertyTest).toBe(false);
      expect(m.signals.hasEnrolledInvariant).toBe(false);
      expect(m.localProof).toBe(0);
    }
  });

  it('an enrolled-invariants ledger with ZERO INV-ids backs nothing (empty enrolled set)', () => {
    // A ledger that exists but enrolls no INV-* id — the line scan finds none, so the
    // early `enrolledIds.size === 0` arm returns an empty backed set.
    mkdirSync(join(bare, 'traceability'), { recursive: true });
    writeFileSync(join(bare, 'traceability/invariants.yaml'), 'invariants: []\n# no enrolled ids here\n');
    const facts = buildProofFacts(bare, fixtureIR());
    for (const m of facts.modules!) {
      expect(m.signals.hasEnrolledInvariant).toBe(false);
    }
  });
});

describe('buildProofFacts — a malformed mutation baseline is a LOUD, tagged throw (never a silent zero)', () => {
  let bad: string;
  beforeAll(() => {
    bad = mkdtempSync(join(tmpdir(), 'czap-lvg-bad-'));
    mkdirSync(join(bad, 'benchmarks'), { recursive: true });
  });
  afterAll(() => {
    rmSync(bad, { recursive: true, force: true });
  });

  it('a mutation-score baseline that is a JSON ARRAY (not a file→score object) throws InvariantViolationError', () => {
    writeFileSync(join(bad, 'benchmarks/mutation-score.json'), JSON.stringify([1, 2, 3]));
    let err: unknown;
    try {
      buildProofFacts(bad, fixtureIR());
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(Error);
    expect(hasTag(err, 'InvariantViolationError')).toBe(true);
  });

  it('a baseline whose VALUES are non-numeric (or non-finite) are skipped, not minted as scores', () => {
    // A well-shaped object whose entries are NaN / strings — those entries are dropped
    // (the `Number.isFinite` guard), so the module stays mutation-unmeasured.
    writeFileSync(
      join(bad, 'benchmarks/mutation-score.json'),
      JSON.stringify({ [A]: 'not-a-number', [B]: Number.NaN }),
    );
    const facts = buildProofFacts(bad, fixtureIR());
    for (const m of facts.modules!) {
      expect(m.signals.mutationScore).toBeNull();
    }
  });
});

describe('readCoverageFractions arms — a vacuous file + a coverage entry outside the repo prefix', () => {
  let cov: string;
  beforeAll(() => {
    cov = mkdtempSync(join(tmpdir(), 'czap-lvg-cov-'));
    mkdirSync(join(cov, 'coverage'), { recursive: true });
    mkdirSync(join(cov, 'tests/unit'), { recursive: true });
    // A: zero-statement file (empty `s`) → vacuously covered = 1. B: an ABSOLUTE path
    // outside the repo prefix → kept under its full normalized path (not repo-relative),
    // so it never matches an IR FileId and contributes no coverage to A/B.
    writeFileSync(
      join(cov, 'coverage/coverage-final.json'),
      JSON.stringify({
        [join(cov, A)]: { s: {} }, // 0 statements → fraction 1
        '/some/other/root/packages/core/src/b.ts': { s: { 0: 0 } }, // outside prefix
        '/not-even/an/object/entry': 42, // entry not an object → skipped
        [join(cov, 'packages/core/src/no-s.ts')]: {}, // object with no `s` → skipped
      }),
    );
  });
  afterAll(() => {
    rmSync(cov, { recursive: true, force: true });
  });

  it('a zero-statement coverage entry is vacuously covered (fraction 1); off-prefix + malformed entries are ignored', () => {
    const facts = buildProofFacts(cov, fixtureIR());
    const a = facts.modules!.find((m) => m.file === A)!;
    const b = facts.modules!.find((m) => m.file === B)!;
    expect(a.signals.coverage).toBe(1); // vacuous coverage
    expect(b.signals.coverage).toBeNull(); // the off-prefix abs path never keyed to B
  });

  it('a coverage report that parses to a NON-OBJECT (e.g. a JSON number) yields no coverage at all', () => {
    const num = mkdtempSync(join(tmpdir(), 'czap-lvg-covnum-'));
    mkdirSync(join(num, 'coverage'), { recursive: true });
    mkdirSync(join(num, 'tests/unit'), { recursive: true });
    writeFileSync(join(num, 'coverage/coverage-final.json'), '123');
    const facts = buildProofFacts(num, fixtureIR());
    for (const m of facts.modules!) expect(m.signals.coverage).toBeNull();
    rmSync(num, { recursive: true, force: true });
  });
});

describe('buildCompositionFacts — the edge-classification arms (external / self / untested / dedup)', () => {
  let comp: string;
  beforeAll(() => {
    comp = mkdtempSync(join(tmpdir(), 'czap-lvg-comp-'));
    mkdirSync(join(comp, 'tests/unit'), { recursive: true });
    // BOTH endpoints individually tested (each deep-imported by SOME test), but no
    // single test touches both → the A→B edge is the UNCOVERED finding.
    writeFileSync(join(comp, 'tests/unit/a.test.ts'), `import { a } from '${A.replace(/\.ts$/, '.js')}';\na();\n`);
    writeFileSync(join(comp, 'tests/unit/b.test.ts'), `import { b } from '${B.replace(/\.ts$/, '.js')}';\nb();\n`);
  });
  afterAll(() => {
    rmSync(comp, { recursive: true, force: true });
  });

  it('skips an EXTERNAL edge (no targetFile), a SELF-import, and an edge to an UNTESTED endpoint; de-duplicates parallel edges', () => {
    const C = 'packages/core/src/c.ts'; // an IR file with NO test → untested endpoint.
    const ir = makeRepoIR({
      files: [
        { id: A, contentDigest: PLACEHOLDER_DIGEST, packageName: '@czap/core' },
        { id: B, contentDigest: PLACEHOLDER_DIGEST, packageName: '@czap/core' },
        { id: C, contentDigest: PLACEHOLDER_DIGEST, packageName: '@czap/core' },
      ],
      imports: [
        // An EXTERNAL import (no targetFile) — skipped.
        { fromFile: A, specifier: 'node:fs', kind: 'external' },
        // A SELF-import — skipped (a module's interaction with itself).
        { fromFile: A, specifier: './a.js', kind: 'relative', targetFile: A },
        // A→C where C is UNTESTED — skipped (a proof-family finding, not a composition gap).
        { fromFile: A, specifier: './c.js', kind: 'relative', targetFile: C },
        // The real composition edge A→B, declared TWICE → de-duplicated to one.
        { fromFile: A, specifier: './b.js', kind: 'relative', targetFile: B },
        { fromFile: A, specifier: '../core/src/b.js', kind: 'relative', targetFile: B },
      ],
    });
    const facts = buildCompositionFacts(comp, ir);
    // Only the single de-duplicated A→B edge survives every skip arm.
    expect(facts.edges).toHaveLength(1);
    const e = facts.edges![0]!;
    expect(e.fromFile).toBe(A);
    expect(e.toFile).toBe(B);
    expect(e.viaSymbol).toBe('b'); // last path segment, no extension
    expect(e.integrationCovered).toBe(false);
    expect(e.evidence._tag).toBe('none');
  });

  it('emits edges in a DETERMINISTIC (fromFile, toFile) order regardless of IR import order', () => {
    const D = 'packages/core/src/d.ts';
    writeFileSync(join(comp, 'tests/unit/d.test.ts'), `import { d } from '${D.replace(/\.ts$/, '.js')}';\nd();\n`);
    const files = [
      { id: A, contentDigest: PLACEHOLDER_DIGEST, packageName: '@czap/core' as const },
      { id: B, contentDigest: PLACEHOLDER_DIGEST, packageName: '@czap/core' as const },
      { id: D, contentDigest: PLACEHOLDER_DIGEST, packageName: '@czap/core' as const },
    ];
    // Declare the two edges in REVERSE sort order; the builder must sort them.
    const ir = makeRepoIR({
      files,
      imports: [
        { fromFile: D, specifier: './b.js', kind: 'relative', targetFile: B },
        { fromFile: A, specifier: './b.js', kind: 'relative', targetFile: B },
      ],
    });
    const facts = buildCompositionFacts(comp, ir);
    const order = facts.edges!.map((e) => `${e.fromFile}->${e.toFile}`);
    expect(order).toEqual([...order].sort());
  });
});
