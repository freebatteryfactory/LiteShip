/**
 * The transition-conformance GATE RUNNER proof — the repo-local host
 * (`scripts/transition-conformance-gate.ts`) folds the SHARED pinned corpus
 * (`tests/support/reactive-conformance.ts`) over the NATIVE CellKernel transports and reds
 * on a regression from the current declared model. An always-green gate is decoration
 * (RED-FIRST, Axiom 5), so this suite proves BOTH arms:
 *   - GREEN: every declared reactive family bisimulates its CURRENT model over the pinned
 *     corpus → 0 findings (the standing native-transport acceptance), with the deliberate
 *     EmissionPolicy deltas (Derived / Timeline under `{distinct}`) CONFORMANT, not errors;
 *   - RED: comparing a dedup family (Derived) under the WRONG `{all}` tolerance (its declared
 *     law is `{distinct}`) leaves the construction-time leading republish uncollapsed → the
 *     pinned histories DIVERGE → blocking L4 findings. The runner catches a real regression,
 *     never a vacuous green.
 *
 * This is the SAME shared runner the property test drives (no second oracle / corpus / law);
 * here it is folded through `transitionConformanceGate` exactly as the CI gate script does.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { transitionConformanceGate, memoryContext } from '@liteship/gauntlet';
import { emissionPolicy } from '../../support/reactive-oracle.js';
import {
  FAMILY_LAWS,
  buildFamilyTransitionFacts,
  DERIVED,
  TRANSITION_FAMILIES,
} from '../../support/reactive-conformance.js';

describe('transition-conformance gate runner — native-transport bisimulation (green) + regression (red)', () => {
  it('GREEN: every declared reactive family bisimulates its current model over the pinned corpus (0 findings)', async () => {
    for (const law of FAMILY_LAWS) {
      const facts = await buildFamilyTransitionFacts(law);
      expect(facts.cases.length).toBeGreaterThan(0);
      // Deliberate EmissionPolicy deltas (Derived leading republish / Timeline dedup) are
      // conformant under their declared {distinct} tolerance — every case is equivalent.
      expect(facts.cases.every((c) => c.status === 'equivalent')).toBe(true);
      const findings = transitionConformanceGate.run({ ...memoryContext({}), transition: facts });
      expect(findings).toHaveLength(0);
    }
  });

  it('covers exactly the six reactive kernel families (the trust spine)', () => {
    expect([...TRANSITION_FAMILIES].sort()).toEqual(['cell', 'derived', 'live-cell', 'signal', 'store', 'timeline']);
  });

  it('RED: Derived under the WRONG {all} tolerance diverges (leading republish) → blocking L4 findings', async () => {
    // Derived's DECLARED law is {distinct}; comparing under {all} leaves the construction-time
    // leading republish uncollapsed, so the pinned histories diverge from the kernel model.
    const facts = await buildFamilyTransitionFacts({ family: 'derived', cfg: DERIVED, policy: emissionPolicy.all() });
    expect(facts.cases.some((c) => c.status === 'divergent')).toBe(true);
    const findings = transitionConformanceGate.run({ ...memoryContext({}), transition: facts });
    expect(findings.length).toBeGreaterThan(0);
    // Derived is an L4 trust-spine family → a divergence BLOCKS (severity error).
    expect(findings.every((f) => f.severity === 'error')).toBe(true);
  });
});
