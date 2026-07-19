/**
 * The TRANSITION-CONFORMANCE gate proof (Wave 5.5, the transition cage — the lean fold
 * half of the constitution's BISIMULATION conformance backbone).
 *
 * The gate folds host-injected {@link TransitionFacts} into self-explaining Findings: a
 * `divergent` bisimulation case (the single-oracle model and the implementation produce
 * different observation digests for one op history) → a replayable Finding at the
 * family's assurance level; an `unevidenced` case → a coverage gap floored by the
 * committed ratchet. This suite proves:
 *   - the gate SELF-PROVES (verifyGate: red caught, green clean, mutation killed) → it
 *     earns blocking authority by the same ratchet every gate does (Axiom 5);
 *   - a divergence at an L4 family blocks (error) and names the SEED + the two
 *     observation digests (so the reader replays exactly what diverged);
 *   - an equivalent case is conformant coverage (no finding);
 *   - `unevidenced` is SEPARATE from divergence (Axiom 4): advisory at/below the
 *     committed baseline, escalated to blocking once the count rises above it;
 *   - the requireTransition guard fails LOUD when the host did not inject.
 *
 * RED-FIRST discipline: the gate was authored to red on a planted divergent case (the
 * red fixture) before earning authority — this suite pins that the red is caught and the
 * green stays clean, so the gate's authority is earned, not granted.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import {
  transitionConformanceGate,
  DIVERGENCE_SEVERITY_BY_LEVEL,
  TRANSITION_FAMILY_LEVEL,
  verifyGate,
  memoryContext,
  type GateContext,
  type TransitionFacts,
  type TransitionCase,
} from '@czap/gauntlet';
import { isTaggedError } from '@czap/error';

/** A case builder — a valid TransitionCase with per-test overrides. */
function transitionCase(over: Partial<TransitionCase> & Pick<TransitionCase, 'status'>): TransitionCase {
  return {
    seed: '0xseed',
    traceDigest: 'sha256:00000000',
    operationCount: 4,
    modelObservationDigest: 'sha256:0000aaaa',
    implementationObservationDigest: over.status === 'divergent' ? 'sha256:0000bbbb' : 'sha256:0000aaaa',
    ...over,
  };
}

/** A GateContext carrying in-memory transition facts. */
function ctx(facts: TransitionFacts): GateContext {
  return { ...memoryContext({}), transition: facts };
}

/** A facts bundle for a family with the given cases (no baseline unless overridden). */
function facts(family: string, cases: readonly TransitionCase[], over: Partial<TransitionFacts> = {}): TransitionFacts {
  return {
    family,
    modelDigest: 'sha256:100d0000',
    implementationDigest: 'sha256:1e100000',
    cases,
    operationCoverage: { subscribe: 1, set: 1 },
    ...over,
  };
}

describe('transitionConformanceGate — self-proof (the authority ratchet)', () => {
  it('self-proves: red caught, green clean, mutation killed → earns blocking authority', () => {
    const proof = verifyGate(transitionConformanceGate);
    expect(proof.redCaught).toBe(true);
    expect(proof.greenClean).toBe(true);
    expect(proof.mutationKilled).toBe(true);
    expect(proof.selfProven).toBe(true);
  });
});

describe('transitionConformanceGate — divergence reporting (REPORT-not-DECIDE)', () => {
  it('a DIVERGENT case at an L4 family is severity error (BLOCKS — the trust spine) and names the seed + digests', () => {
    const findings = transitionConformanceGate.run(
      ctx(
        facts('cell', [
          transitionCase({
            status: 'divergent',
            seed: '0xdiverge',
            traceDigest: 'sha256:deadbeef',
            modelObservationDigest: 'sha256:11110000',
            implementationObservationDigest: 'sha256:22220000',
          }),
        ]),
      ),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe('error');
    expect(findings[0]!.level).toBe('L4');
    // The finding is REPLAYABLE — it names the seed + the trace + both observation digests.
    expect(findings[0]!.detail).toContain('0xdiverge');
    expect(findings[0]!.detail).toContain('sha256:deadbeef');
    expect(findings[0]!.detail).toContain('sha256:11110000');
    expect(findings[0]!.detail).toContain('sha256:22220000');
    expect(findings[0]!.title).toContain('cell');
  });

  it('an EQUIVALENT case produces no finding (the bisimulation held — conformant coverage)', () => {
    const findings = transitionConformanceGate.run(ctx(facts('cell', [transitionCase({ status: 'equivalent' })])));
    expect(findings).toHaveLength(0);
  });

  it('an unknown family defaults to L4 (the fail-safe direction for a conformance cage)', () => {
    const findings = transitionConformanceGate.run(
      ctx(facts('some-unmapped-family', [transitionCase({ status: 'divergent' })])),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]!.level).toBe('L4');
    expect(findings[0]!.severity).toBe('error');
  });

  it('emits divergences deterministically (sorted, stable report)', () => {
    const built = facts('cell', [
      transitionCase({ status: 'divergent', seed: '0xzzz' }),
      transitionCase({ status: 'equivalent', seed: '0xmmm' }),
      transitionCase({ status: 'divergent', seed: '0xaaa' }),
    ]);
    const first = transitionConformanceGate.run(ctx(built)).map((f) => f.title);
    const second = transitionConformanceGate.run(ctx(built)).map((f) => f.title);
    expect(second).toEqual(first);
    // Two divergences (the equivalent produces nothing), seed-sorted.
    expect(first).toHaveLength(2);
    expect(first[0]).toContain('0xaaa');
    expect(first[1]).toContain('0xzzz');
  });
});

describe('transitionConformanceGate — unevidenced is SEPARATE from divergence (Axiom 4) + the ratchet', () => {
  it('an unevidenced case with NO committed baseline is advisory (first measurement, never a regression)', () => {
    const findings = transitionConformanceGate.run(ctx(facts('cell', [transitionCase({ status: 'unevidenced' })])));
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe('advisory');
    expect(findings[0]!.title).toContain('unevidenced');
  });

  it('an unevidenced count AT or BELOW the baseline is advisory (calibrating debt)', () => {
    const findings = transitionConformanceGate.run(
      ctx(facts('cell', [transitionCase({ status: 'unevidenced' })], { unevidencedBaseline: 1 })),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe('advisory');
  });

  it('an unevidenced count ABOVE the baseline ESCALATES to blocking (the ratchet: the count may only fall)', () => {
    const findings = transitionConformanceGate.run(
      ctx(
        facts(
          'cell',
          [
            transitionCase({ status: 'unevidenced', seed: '0xa' }),
            transitionCase({ status: 'unevidenced', seed: '0xb' }),
          ],
          {
            unevidencedBaseline: 1, // measured 2 > baseline 1 → regression
          },
        ),
      ),
    );
    expect(findings).toHaveLength(2);
    // Both unevidenced findings escalate to the family's severity-by-level (L4 → error).
    expect(findings.every((f) => f.severity === 'error')).toBe(true);
  });

  it('an equivalent + an unevidenced case: only the unevidenced surfaces (equivalent is silent)', () => {
    const findings = transitionConformanceGate.run(
      ctx(
        facts('cell', [
          transitionCase({ status: 'equivalent', seed: '0xok' }),
          transitionCase({ status: 'unevidenced', seed: '0xgap' }),
        ]),
      ),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]!.title).toContain('unevidenced');
    expect(findings[0]!.title).toContain('0xgap');
  });
});

describe('transitionConformanceGate — redlinable data + the guard', () => {
  it('the divergence severity ladder is the documented data', () => {
    expect(DIVERGENCE_SEVERITY_BY_LEVEL.L4).toBe('error');
    expect(DIVERGENCE_SEVERITY_BY_LEVEL.L3).toBe('error');
    expect(DIVERGENCE_SEVERITY_BY_LEVEL.L2).toBe('warning');
    expect(DIVERGENCE_SEVERITY_BY_LEVEL.L1).toBe('advisory');
    expect(DIVERGENCE_SEVERITY_BY_LEVEL.L0).toBe('advisory');
  });

  it('every reactive kernel family resolves L4 (the trust spine)', () => {
    for (const family of ['cell', 'derived', 'store', 'signal', 'timeline', 'live-cell']) {
      expect(TRANSITION_FAMILY_LEVEL[family]).toBe('L4');
    }
  });

  it('requireTransition throws a tagged error when no transition facts were injected', () => {
    const noTransition: GateContext = { ...memoryContext({}) };
    expect.assertions(2);
    try {
      transitionConformanceGate.run(noTransition);
    } catch (e) {
      expect(isTaggedError(e)).toBe(true);
      expect((e as { message: string }).message).toContain('transition-conformance facts');
    }
  });
});
