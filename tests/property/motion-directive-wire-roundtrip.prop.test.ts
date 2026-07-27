/** Semantic round-trip laws for the Astro motion directive wire envelope. */

import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { Reveal, sampleProgram, type RuntimeWritePlan } from '@liteship/core/motion';
import { StateName } from '@liteship/core/schema';
import {
  decodeMotionDirectivePayload,
  parseMotionDirectivePayload,
  serializeMotionDirectivePayload,
  type MotionDirectivePayload,
} from '@liteship/astro/runtime';

function recursivelyFrozen(value: unknown): boolean {
  if (value === null || typeof value !== 'object') return true;
  return Object.isFrozen(value) && Object.values(value).every(recursivelyFrozen);
}

describe('MotionDirectivePayload semantic wire laws', () => {
  test('round-trips immutable meaning and preserves runtime sampling', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1_000, max: 1_000, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: -1_000, max: 1_000, noNaN: true, noDefaultInfinity: true }),
        fc.integer({ min: 0, max: 10_000 }),
        fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
        (from, to, durationMs, threshold) => {
          const runtime: RuntimeWritePlan = {
            properties: [{ cssVar: '--fixture-x', from: { k: 'number', v: from }, to: { k: 'number', v: to } }],
            fromState: StateName('before'),
            toState: StateName('after'),
            durationMs,
            routing: 'seq',
            easing: { kind: 'linear' },
          };
          const source: MotionDirectivePayload = {
            intent: Reveal.intent({
              target: 'fixture',
              trigger: { type: 'scroll', axis: 'progress' },
              from: { x: from },
              to: { x: to },
              transition: { durationMs, easing: 'linear' },
              policy: { reducedMotion: 'none', motionTier: 'transitions' },
            }),
            runtime,
            signals: ['scroll.progress'],
            threshold,
          };

          const wire = serializeMotionDirectivePayload(source);
          const decoded = parseMotionDirectivePayload(wire);
          expect(decoded).not.toBeNull();
          expect(serializeMotionDirectivePayload(decoded)).toBe(wire);
          expect(decoded!.threshold).toBe(threshold);
          expect(decoded!.signals).toEqual(source.signals);
          expect(recursivelyFrozen(decoded)).toBe(true);
          for (const t of [0, 0.25, 0.5, 0.75, 1]) {
            expect(sampleProgram(decoded!.runtime, t)).toEqual(sampleProgram(source.runtime, t));
          }
        },
      ),
      { seed: 0xd3_2026, numRuns: 80 },
    );
  });

  test('refuses semantic drift fields instead of silently dropping them', () => {
    const base = {
      intent: Reveal.intent({
        target: 'fixture',
        trigger: { type: 'scroll', axis: 'progress' },
        from: { opacity: 0 },
        to: { opacity: 1 },
        transition: { durationMs: 100 },
        policy: { reducedMotion: 'none', motionTier: 'transitions' },
      }),
      runtime: {
        properties: [],
        fromState: 'before',
        toState: 'after',
        durationMs: 100,
        routing: 'seq',
        easing: { kind: 'linear' },
      },
      signals: [],
    };
    expect(() => decodeMotionDirectivePayload({ ...base, unownedMeaning: true })).toThrow(/unknown field/u);

    let getterCalls = 0;
    const accessorEnvelope = { ...base } as Record<string, unknown>;
    Object.defineProperty(accessorEnvelope, 'signals', {
      enumerable: true,
      get() {
        getterCalls++;
        return [];
      },
    });
    expect(() => decodeMotionDirectivePayload(accessorEnvelope)).toThrow(/accessor field signals/u);
    expect(getterCalls).toBe(0);
  });
});
