// GENERATED — do not edit by hand
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { decode } from '../../packages/core/src/schema/index.js';
import { escalationChooseTierCapsule } from '../../packages/core/src/authoring/capsules/escalation-choose-tier.js';
import { schemaToArbitrary } from '../../packages/core/src/harness/arbitrary-from-schema.js';

describe('core.escalation.choose-tier', () => {
  // The REAL binding at its REAL declared type. A structural re-assertion here
  // (the old `as { input: Schema<unknown>; ... }`) claimed a shape the capsule
  // never had, so subject/verdict drift compiled clean; reading the declaration
  // directly makes that drift a typecheck failure.
  const cap = escalationChooseTierCapsule;
  // capsule:compile resolved the subject schema as arbitrary-derivable + `decide`
  // present, so we sample the subject via the canonical walker and drive the REAL
  // decide. A regression in the walker throws at schemaToArbitrary and fails the
  // suite RED — correct, never a green skip.
  const subjectArb = schemaToArbitrary(cap.input as never) as fc.Arbitrary<unknown>;
  const decide = cap.decide!;

  it('allow/deny coverage: every verdict is a well-formed Decision (reasons non-empty iff deny)', () => {
    fc.assert(
      fc.property(subjectArb, (subject) => {
        const verdict = decide(subject as never);
        expect(verdict.effect === 'allow' || verdict.effect === 'deny').toBe(true);
        expect(Array.isArray(verdict.reasons)).toBe(true);
        // The reason-chain law: a denial MUST name why (non-empty chain); an allow
        // carries an empty-or-informational chain. Non-empty EXACTLY when deny.
        if (verdict.effect === 'deny') {
          expect(verdict.reasons.length).toBeGreaterThan(0);
        } else {
          expect(verdict.reasons.length).toBe(0);
        }
        return true;
      }),
      { seed: 0x5eed, numRuns: 100 },
    );
  });

  it('reason-chain integrity: every reason has non-empty {code, message} and decodes against the verdict schema', () => {
    fc.assert(
      fc.property(subjectArb, (subject) => {
        const verdict = decide(subject as never);
        for (const reason of verdict.reasons) {
          expect(typeof reason.code).toBe('string');
          expect(reason.code.length).toBeGreaterThan(0);
          expect(typeof reason.message).toBe('string');
          expect(reason.message.length).toBeGreaterThan(0);
        }
        // The whole verdict decodes against the declared Decision schema — the
        // reasons decode as typed reasons, not arbitrary objects. Strict kernel
        // decode returns the verdict unchanged (the policyGate analogue of the
        // receipt byte law).
        const decoded = decode(cap.output as never, verdict);
        expect(decoded.ok).toBe(true);
        if (decoded.ok) expect(decoded.value).toEqual(verdict);
        return true;
      }),
      { seed: 0x5eed, numRuns: 100 },
    );
  });

  it('determinism: the same subject yields a deep-equal verdict twice (pure decide core)', () => {
    fc.assert(
      fc.property(subjectArb, (subject) => {
        expect(decide(subject as never)).toEqual(decide(subject as never));
        return true;
      }),
      { seed: 0x5eed, numRuns: 100 },
    );
  });

  for (const inv of cap.invariants) {
    it(`invariant: ${inv.name}`, () => {
      fc.assert(
        fc.property(subjectArb, (subject) => {
          const verdict = decide(subject as never);
          return inv.check(subject as never, verdict as never);
        }),
        { seed: 0x5eed, numRuns: 100 },
      );
    });
  }
});
