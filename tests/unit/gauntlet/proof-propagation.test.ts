/**
 * The PROOF-PROPAGATION gate proof (the LOCAL-VS-GLOBAL correctness family — the
 * lax-functor: local proof ≤ weakest dependency).
 *
 * The gate folds host-injected {@link ProofFacts} (per-module blended proof scalars),
 * PROPAGATES them along the IR's dep DAG via the {@link propagateProofStrength}
 * `min`-fixpoint (the dual of assurance propagation), and reports each trust-spine
 * module whose EFFECTIVE/global proof drops below its level floor BECAUSE of a weak
 * dependency. This suite proves:
 *   - the gate SELF-PROVES (verifyGate: red caught, green clean, mutation killed) →
 *     it earns blocking authority by the same ratchet every gate does;
 *   - the propagation is DETERMINISTIC (twice → identical) + CYCLE-SAFE (terminates on
 *     a cyclic dep graph) + MONOTONE-DECREASING (effective ≤ local);
 *   - the floor calibration (an L4 global drop blocks; an L1 is advisory);
 *   - the level is the PROPAGATED level (THE LAW: from the live IR, never hardcoded);
 *   - a purely-LOCAL gap (effective === local) is NOT this gate's finding (no
 *     double-counting the mutation/coverage families);
 *   - the weak-link PATH names the capping dependency;
 *   - the requireIR guard fails LOUD; an absent facts set is an honest advisory.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import {
  proofPropagationGate,
  PROOF_FLOOR_BY_LEVEL,
  PROOF_SEVERITY_BY_LEVEL,
  UNMEASURED_WEAK_LINK_SEVERITY,
  propagateProofStrength,
  weakestLinkPath,
  verifyGate,
  makeRepoIR,
  memoryContext,
  PLACEHOLDER_DIGEST,
  UNMEASURED_PROOF,
  type GateContext,
  type RepoIR,
  type ProofFacts,
  type ModuleProof,
  type ProofSignals,
} from '@liteship/gauntlet';
import { isTaggedError } from '@liteship/error';

const L4_FILE = 'packages/core/src/schema/brands.ts'; // an L4 glob in the assurance map
const L1_FILE = 'packages/x/src/a.ts'; // an ordinary L1 file
const DEP = 'packages/core/src/dep.ts'; // a dependency the L4 file imports

const STRONG: ProofSignals = { mutationScore: 1, coverage: 0.98, hasPropertyTest: true, hasEnrolledInvariant: true };
const WEAK: ProofSignals = { mutationScore: 0.2, coverage: 0.3, hasPropertyTest: false, hasEnrolledInvariant: false };

function mp(file: string, localProof: number, signals: ProofSignals = STRONG): ModuleProof {
  return { file, localProof, signals };
}

function ctx(ir: RepoIR, proof: ProofFacts): GateContext {
  return { ...memoryContext({}), ir, proof };
}

/** An IR where `from` imports `to` (a dep edge). */
function depIR(from: string, to: string): RepoIR {
  return makeRepoIR({
    files: [
      { id: from, contentDigest: PLACEHOLDER_DIGEST, packageName: '@liteship/core' },
      { id: to, contentDigest: PLACEHOLDER_DIGEST, packageName: '@liteship/core' },
    ],
    imports: [{ fromFile: from, specifier: './dep.js', kind: 'relative', targetFile: to }],
  });
}

describe('proofPropagationGate — self-proof (the authority ratchet)', () => {
  it('self-proves: red caught, green clean, mutation killed → earns blocking authority', () => {
    const proof = verifyGate(proofPropagationGate);
    expect(proof.redCaught).toBe(true);
    expect(proof.greenClean).toBe(true);
    expect(proof.mutationKilled).toBe(true);
    expect(proof.selfProven).toBe(true);
  });
});

describe('propagateProofStrength — the lax-functor (min over the dep DAG)', () => {
  it('caps an importer at its weaker dependency (local proof does not compose past a weak dep)', () => {
    const ir = depIR(L4_FILE, DEP);
    const local = new Map([[L4_FILE, 0.95], [DEP, 0.2]]);
    const eff = propagateProofStrength(ir, (f) => local.get(f) ?? UNMEASURED_PROOF);
    expect(eff.get(L4_FILE)).toBeCloseTo(0.2); // capped by the weak dep
    expect(eff.get(DEP)).toBeCloseTo(0.2); // its own local proof
  });

  it('is DETERMINISTIC — the same IR + lookup yields an identical map twice', () => {
    const ir = depIR(L4_FILE, DEP);
    const local = new Map([[L4_FILE, 0.9], [DEP, 0.4]]);
    const a = propagateProofStrength(ir, (f) => local.get(f) ?? 0);
    const b = propagateProofStrength(ir, (f) => local.get(f) ?? 0);
    expect([...a.entries()].sort()).toEqual([...b.entries()].sort());
  });

  it('is CYCLE-SAFE — terminates on a cyclic dep graph, dropping the cycle to its minimum', () => {
    const A = 'packages/core/src/a.ts';
    const B = 'packages/core/src/b.ts';
    const ir = makeRepoIR({
      files: [
        { id: A, contentDigest: PLACEHOLDER_DIGEST, packageName: '@liteship/core' },
        { id: B, contentDigest: PLACEHOLDER_DIGEST, packageName: '@liteship/core' },
      ],
      imports: [
        { fromFile: A, specifier: './b.js', kind: 'relative', targetFile: B },
        { fromFile: B, specifier: './a.js', kind: 'relative', targetFile: A },
      ],
    });
    const local = new Map([[A, 0.9], [B, 0.3]]);
    const eff = propagateProofStrength(ir, (f) => local.get(f) ?? 0);
    // The whole SCC drops to its minimum member (0.3) and stops changing.
    expect(eff.get(A)).toBeCloseTo(0.3);
    expect(eff.get(B)).toBeCloseTo(0.3);
  });

  it('rejects an out-of-range proof scalar LOUDLY (never silently clamped into a lie)', () => {
    const ir = depIR(L4_FILE, DEP);
    expect.assertions(1);
    try {
      propagateProofStrength(ir, () => 1.5);
    } catch (e) {
      expect(isTaggedError(e)).toBe(true);
    }
  });
});

describe('weakestLinkPath — names the capping dependency', () => {
  it('returns the chain to the dependency whose local proof equals the effective floor', () => {
    const ir = depIR(L4_FILE, DEP);
    const local = new Map([[L4_FILE, 0.95], [DEP, 0.2]]);
    const lookup = (f: string): number => local.get(f) ?? 0;
    const eff = propagateProofStrength(ir, lookup);
    const path = weakestLinkPath(ir, L4_FILE, eff, lookup);
    expect(path).toEqual([L4_FILE, DEP]);
  });
});

describe('proofPropagationGate — the floor calibration + THE LAW (propagated level)', () => {
  it('an L4 module dragged below the floor by a weak dep is severity error (BLOCKS)', () => {
    const findings = proofPropagationGate.run(
      ctx(depIR(L4_FILE, DEP), { modules: [mp(L4_FILE, 0.95), mp(DEP, 0.2, WEAK)] }),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]!.level).toBe('L4');
    expect(findings[0]!.severity).toBe('error');
    // The finding names the weak-link path + the capping dependency.
    expect(findings[0]!.detail).toContain(DEP);
    expect(findings[0]!.detail).toContain('weak-link path');
  });

  it('a dependency PULLED into an L4 path inherits L4 — the importer drop is reported at L4', () => {
    // The dep's glob level is L1, but it is imported by the L4 file → the IMPORTER's
    // drop is L4. (The dep itself, at L1, has no floor — it is not the finding here.)
    const findings = proofPropagationGate.run(
      ctx(depIR(L4_FILE, DEP), { modules: [mp(L4_FILE, 0.95), mp(DEP, 0.2, WEAK)] }),
    );
    expect(findings.every((f) => f.level === 'L4')).toBe(true);
  });

  it('clears the floor when the dependency is strongly proven → 0 findings', () => {
    const findings = proofPropagationGate.run(
      ctx(depIR(L4_FILE, DEP), { modules: [mp(L4_FILE, 0.95), mp(DEP, 0.95)] }),
    );
    expect(findings).toHaveLength(0);
  });
});

describe('proofPropagationGate — differentiates measured-weak vs unmeasured (aimed cannon)', () => {
  const UNMEASURED: ProofSignals = { mutationScore: null, coverage: null, hasPropertyTest: false, hasEnrolledInvariant: false };

  it('a MEASURED-and-weak dependency BLOCKS the L4 importer (error)', () => {
    const findings = proofPropagationGate.run(
      ctx(depIR(L4_FILE, DEP), { modules: [mp(L4_FILE, 0.95), mp(DEP, 0.2, WEAK)] }),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe('error');
    expect(findings[0]!.detail).toContain('IS measured and IS weak');
  });

  it('an UNMEASURED dependency is a quiet advisory (a measurement-coverage gap, not a block)', () => {
    // The dep has NO mutation + NO coverage signal (the host never measured it) — so the
    // L4 importer's drop is a "go measure the dep" advisory, NOT a blocking composition
    // risk. This is what keeps 281 raw drops from drowning the real measured-weak ones.
    const findings = proofPropagationGate.run(
      ctx(depIR(L4_FILE, DEP), { modules: [mp(L4_FILE, 0.95), mp(DEP, 0, UNMEASURED)] }),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe(UNMEASURED_WEAK_LINK_SEVERITY);
    expect(findings[0]!.severity).toBe('advisory');
    expect(findings[0]!.detail).toContain('MEASUREMENT-coverage gap');
  });
});

describe('proofPropagationGate — stays in its lane (no double-counting local gaps)', () => {
  it('a purely-LOCAL gap (effective === local, no weaker dep) is NOT this gate\'s finding', () => {
    // The L4 file is itself weakly proven (0.2) but its dep is STRONG (1.0) — so the
    // min-fold does NOT lower it (effective === local === 0.2). That is a LOCAL gap the
    // mutation/coverage families own; this gate must stay silent (no double-count).
    const findings = proofPropagationGate.run(
      ctx(depIR(L4_FILE, DEP), { modules: [mp(L4_FILE, 0.2, WEAK), mp(DEP, 1.0)] }),
    );
    expect(findings).toHaveLength(0);
  });
});

describe('proofPropagationGate — the redlinable floor data', () => {
  it('is the documented ladder', () => {
    expect(PROOF_FLOOR_BY_LEVEL.L4).toBe(0.9);
    expect(PROOF_FLOOR_BY_LEVEL.L3).toBe(0.75);
    expect(PROOF_FLOOR_BY_LEVEL.L2).toBe(0.5);
    expect(PROOF_FLOOR_BY_LEVEL.L1).toBe(0);
    expect(PROOF_SEVERITY_BY_LEVEL.L4).toBe('error');
    expect(PROOF_SEVERITY_BY_LEVEL.L2).toBe('warning');
    expect(PROOF_SEVERITY_BY_LEVEL.L1).toBe('advisory');
  });
});

describe('proofPropagationGate — honest under-coverage + the guard', () => {
  it('reports an advisory "not-evidenced" when no proof facts were injected (never a silent green)', () => {
    const findings = proofPropagationGate.run({ ...memoryContext({}), ir: depIR(L4_FILE, DEP) });
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe('advisory');
    expect(findings[0]!.title).toContain('not evidenced');
  });

  it('requireIR throws a tagged error when no IR was injected', () => {
    const noIR: GateContext = { ...memoryContext({}), proof: { modules: [mp(L4_FILE, 0.5)] } };
    expect.assertions(1);
    try {
      proofPropagationGate.run(noIR);
    } catch (e) {
      expect(isTaggedError(e)).toBe(true);
    }
  });
});
