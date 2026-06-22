/**
 * The COMPOSITION-COVERAGE gate proof (the LOCAL-VS-GLOBAL correctness family —
 * "locally green, globally untested interaction").
 *
 * The gate folds host-injected {@link CompositionFacts} (the interaction edges between
 * individually-tested units, each classified covered/uncovered) into self-explaining
 * Findings: an UNCOVERED composition edge → a Finding at the edge's PROPAGATED level.
 * This suite proves:
 *   - the gate SELF-PROVES (verifyGate: red caught, green clean, mutation killed) →
 *     it earns blocking authority by the same ratchet every gate does;
 *   - an uncovered L4 edge blocks (error); an L1 edge is advisory;
 *   - the edge level is the MORE-CRITICAL endpoint's PROPAGATED level (THE LAW: from
 *     the live IR — a call INTO an L4 file is an L4-critical interaction);
 *   - a covered edge produces no finding;
 *   - the finding STATES the evidence class (the honest over-approximation limit);
 *   - an absent facts set is an honest advisory; the requireIR guard fails LOUD.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import {
  compositionCoverageGate,
  COMPOSITION_SEVERITY_BY_LEVEL,
  verifyGate,
  makeRepoIR,
  memoryContext,
  PLACEHOLDER_DIGEST,
  type GateContext,
  type RepoIR,
  type CompositionFacts,
  type InteractionEdge,
  type CoverageEvidence,
} from '@czap/gauntlet';
import { isTaggedError } from '@czap/error';

const L4_FILE = 'packages/core/src/brands.ts'; // an L4 glob in the assurance map
const L1_CALLER = 'packages/x/src/caller.ts'; // an L1 caller of the L4 file
const L1_OTHER = 'packages/x/src/other.ts'; // an ordinary L1 file

function ctx(ir: RepoIR, composition: CompositionFacts): GateContext {
  return { ...memoryContext({}), ir, composition };
}

/** An IR where `from` imports `to`. */
function edgeIR(from: string, to: string): RepoIR {
  return makeRepoIR({
    files: [
      { id: from, contentDigest: PLACEHOLDER_DIGEST, packageName: '@czap/core' },
      { id: to, contentDigest: PLACEHOLDER_DIGEST, packageName: '@czap/core' },
    ],
    imports: [{ fromFile: from, specifier: './t.js', kind: 'relative', targetFile: to }],
  });
}

function edge(from: string, to: string, integrationCovered: boolean, evidence: CoverageEvidence): InteractionEdge {
  return { fromFile: from, toFile: to, viaSymbol: 'fn', integrationCovered, evidence };
}

describe('compositionCoverageGate — self-proof (the authority ratchet)', () => {
  it('self-proves: red caught, green clean, mutation killed → earns blocking authority', () => {
    const proof = verifyGate(compositionCoverageGate);
    expect(proof.redCaught).toBe(true);
    expect(proof.greenClean).toBe(true);
    expect(proof.mutationKilled).toBe(true);
    expect(proof.selfProven).toBe(true);
  });
});

describe('compositionCoverageGate — the level + the calibration (THE LAW: propagated)', () => {
  it('an uncovered edge INTO an L4 file is an L4-critical interaction (error, BLOCKS)', () => {
    // The caller is L1, the callee is L4 → the edge inherits the MORE-CRITICAL L4.
    const findings = compositionCoverageGate.run(
      ctx(edgeIR(L1_CALLER, L4_FILE), { edges: [edge(L1_CALLER, L4_FILE, false, { _tag: 'none' })] }),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]!.level).toBe('L4');
    expect(findings[0]!.severity).toBe('error');
    expect(findings[0]!.title).toContain('Untested composition edge');
  });

  it('an uncovered edge between two L1 units is advisory debt', () => {
    const findings = compositionCoverageGate.run(
      ctx(edgeIR(L1_CALLER, L1_OTHER), { edges: [edge(L1_CALLER, L1_OTHER, false, { _tag: 'none' })] }),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]!.level).toBe('L1');
    expect(findings[0]!.severity).toBe('advisory');
  });

  it('a COVERED edge produces no finding', () => {
    const findings = compositionCoverageGate.run(
      ctx(edgeIR(L1_CALLER, L4_FILE), {
        edges: [edge(L1_CALLER, L4_FILE, true, { _tag: 'execution', testId: 'tests/integration/x.test.ts' })],
      }),
    );
    expect(findings).toHaveLength(0);
  });
});

describe('compositionCoverageGate — the honest over-approximation is STATED', () => {
  it('a static-reference uncovered verdict names the over-approximation in the detail', () => {
    const findings = compositionCoverageGate.run(
      ctx(edgeIR(L1_CALLER, L4_FILE), {
        edges: [edge(L1_CALLER, L4_FILE, false, { _tag: 'none' })],
      }),
    );
    expect(findings[0]!.detail).toContain('over-approximation');
    expect(findings[0]!.detail).toContain('together');
  });
});

describe('compositionCoverageGate — the redlinable severity data', () => {
  it('is the documented ladder', () => {
    expect(COMPOSITION_SEVERITY_BY_LEVEL.L4).toBe('error');
    expect(COMPOSITION_SEVERITY_BY_LEVEL.L3).toBe('error');
    expect(COMPOSITION_SEVERITY_BY_LEVEL.L2).toBe('warning');
    expect(COMPOSITION_SEVERITY_BY_LEVEL.L1).toBe('advisory');
  });
});

describe('compositionCoverageGate — honest under-coverage + the guard', () => {
  it('reports an advisory "not-evidenced" when no composition facts were injected', () => {
    const findings = compositionCoverageGate.run({ ...memoryContext({}), ir: edgeIR(L1_CALLER, L4_FILE) });
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe('advisory');
    expect(findings[0]!.title).toContain('not evidenced');
  });

  it('requireIR throws a tagged error when no IR was injected', () => {
    const noIR: GateContext = { ...memoryContext({}), composition: { edges: [] } };
    expect.assertions(1);
    try {
      compositionCoverageGate.run(noIR);
    } catch (e) {
      expect(isTaggedError(e)).toBe(true);
    }
  });
});
