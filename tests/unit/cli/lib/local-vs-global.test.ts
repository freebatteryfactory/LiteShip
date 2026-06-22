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
