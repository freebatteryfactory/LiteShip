// GENERATED — do not edit by hand
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { decode } from '../../packages/core/src/schema/index.js';
import type { Schema } from '../../packages/core/src/schema/index.js';
import { escalationChooseRungCapsule } from '../../packages/core/src/capsules/escalation-choose-rung.js';
import { schemaToArbitrary } from '../../packages/core/src/harness/arbitrary-from-schema.js';

describe('core.escalation.choose-rung', () => {
  const cap = escalationChooseRungCapsule as {
    input: Schema<unknown>;
    output: Schema<unknown>;
    decide?: (subject: unknown) => { effect: 'allow' | 'deny'; reasons: ReadonlyArray<{ code: string; message: string }> };
    invariants: ReadonlyArray<{ name: string; check: (subject: unknown, verdict: unknown) => boolean }>;
  };
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
      { numRuns: 100 },
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
      { numRuns: 100 },
    );
  });

  it('determinism: the same subject yields a deep-equal verdict twice (pure decide core)', () => {
    fc.assert(
      fc.property(subjectArb, (subject) => {
        expect(decide(subject as never)).toEqual(decide(subject as never));
        return true;
      }),
      { numRuns: 100 },
    );
  });

  for (const inv of cap.invariants) {
    it(`invariant: ${inv.name}`, () => {
      fc.assert(
        fc.property(subjectArb, (subject) => {
          const verdict = decide(subject as never);
          return inv.check(subject as never, verdict as never);
        }),
        { numRuns: 100 },
      );
    });
  }
});
