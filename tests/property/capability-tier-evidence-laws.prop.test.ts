import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import {
  CAPABILITY_EVIDENCE_INPUTS,
  projectCapabilityTierEvidence,
  requireObserved,
  type CapabilityEvidenceInput,
  type CapabilityEvidenceInputs,
  type CapabilityEvidenceSupport,
} from '@liteship/detect';
import { ClientHints } from '@liteship/edge';

const tierValues = {
  capTier: 'reactive' as const,
  motionTier: 'animations' as const,
  designTier: 'enhanced' as const,
};

function evidenceInputs(
  supportFor: (input: CapabilityEvidenceInput) => CapabilityEvidenceSupport,
): CapabilityEvidenceInputs {
  return Object.freeze(
    Object.fromEntries(
      CAPABILITY_EVIDENCE_INPUTS.map((input) => [
        input,
        Object.freeze({ input, support: supportFor(input), source: `${input}-fixture` }),
      ]),
    ),
  ) as CapabilityEvidenceInputs;
}

function observedAxisCount(evidence: ReturnType<typeof projectCapabilityTierEvidence>): number {
  return Object.values(evidence).filter((axis) => axis.support === 'observed').length;
}

describe('capability tier evidence laws', () => {
  test('an inferred primitive can never produce an observed dependent axis', () => {
    fc.assert(
      fc.property(fc.constantFrom(...CAPABILITY_EVIDENCE_INPUTS), (inferredInput) => {
        const evidence = projectCapabilityTierEvidence(
          tierValues,
          evidenceInputs((input) => (input === inferredInput ? 'inferred' : 'observed')),
        );
        for (const axis of Object.values(evidence)) {
          if (axis.inputs.some((input) => input.input === inferredInput)) {
            expect(axis.support).toBe('inferred');
          }
        }
      }),
      { seed: 0x15e1_0001, numRuns: 100 },
    );
  });

  test('adding observed probes is monotone: it cannot make an observed axis inferred', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.constantFrom(...CAPABILITY_EVIDENCE_INPUTS)),
        fc.uniqueArray(fc.constantFrom(...CAPABILITY_EVIDENCE_INPUTS)),
        (baselineObserved, addedObserved) => {
          const baseline = new Set(baselineObserved);
          const upgraded = new Set([...baselineObserved, ...addedObserved]);
          const before = projectCapabilityTierEvidence(
            tierValues,
            evidenceInputs((input) => (baseline.has(input) ? 'observed' : 'inferred')),
          );
          const after = projectCapabilityTierEvidence(
            tierValues,
            evidenceInputs((input) => (upgraded.has(input) ? 'observed' : 'inferred')),
          );
          expect(observedAxisCount(after)).toBeGreaterThanOrEqual(observedAxisCount(before));
        },
      ),
      { seed: 0x15e1_0002, numRuns: 200 },
    );
  });

  test('valid Client Hints increase input evidence without laundering still-inferred axes', () => {
    fc.assert(
      fc.property(fc.constantFrom('0.25', '0.5', '1', '2', '4', '8'), fc.boolean(), (memory, reduced) => {
        const baseline = ClientHints.parseEvidence({});
        const enriched = ClientHints.parseEvidence({
          'sec-ch-device-memory': memory,
          'sec-ch-prefers-reduced-motion': reduced ? 'reduce' : 'no-preference',
        });
        const before = Object.values(baseline.inputEvidence).filter((input) => input.support === 'observed').length;
        const after = Object.values(enriched.inputEvidence).filter((input) => input.support === 'observed').length;
        expect(after).toBeGreaterThanOrEqual(before);
        expect(enriched.inputEvidence.memory.support).toBe('observed');
        expect(enriched.inputEvidence.prefersReducedMotion.support).toBe('observed');
      }),
      { seed: 0x15e1_0003, numRuns: 100 },
    );
  });

  test('requireObserved rejects incomplete axes and names each inferred source', () => {
    const evidence = projectCapabilityTierEvidence(
      tierValues,
      evidenceInputs((input) => (input === 'gpu' || input === 'cores' ? 'inferred' : 'observed')),
    );
    expect(() => requireObserved(evidence, ['tier', 'motion'])).toThrowError(
      /tier .*gpu via gpu-fixture.*cores via cores-fixture/s,
    );
    expect(() => requireObserved(evidence, ['tier', 'motion'])).toThrowError(
      /motion .*gpu via gpu-fixture.*cores via cores-fixture/s,
    );
  });

  test('requireObserved returns an immutable witnessed view containing only requested axes', () => {
    const evidence = projectCapabilityTierEvidence(
      tierValues,
      evidenceInputs(() => 'observed'),
    );
    const witnessed = requireObserved(evidence, ['motion']);
    expect(witnessed).toEqual({ motion: 'animations' });
    expect(Object.isFrozen(witnessed)).toBe(true);
    expect('tier' in witnessed).toBe(false);
  });
});
