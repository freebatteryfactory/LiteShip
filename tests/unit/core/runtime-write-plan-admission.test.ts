import { describe, expect, it } from 'vitest';
import { hasTag } from '@liteship/error';
import { TypeValidator } from '@liteship/core';
import { decodeRuntimeWritePlan, RuntimeWritePlanSchema, type RuntimeWritePlan } from '@liteship/core/motion';

function fixture(): RuntimeWritePlan {
  return {
    properties: [
      {
        cssVar: '--liteship-transform',
        from: {
          k: 'transform',
          parts: [{ fn: 'translateY', args: [{ k: 'length', v: 24, unit: 'px' }] }],
        },
        to: {
          k: 'transform',
          parts: [{ fn: 'translateY', args: [{ k: 'length', v: 0, unit: 'px' }] }],
        },
      },
    ],
    durationMs: 300,
    routing: 'seq',
    fromState: 'hidden' as RuntimeWritePlan['fromState'],
    toState: 'visible' as RuntimeWritePlan['toState'],
    easing: { kind: 'spring', spring: { stiffness: 200, damping: 20, mass: 1 } },
    windows: [
      {
        windowStart: 0,
        windowEnd: 1,
        properties: [{ cssVar: '--liteship-opacity', from: { k: 'opacity', v: 0 }, to: { k: 'opacity', v: 1 } }],
        easing: { kind: 'points', points: [0, 0.4, 1] },
      },
    ],
  };
}

describe('RuntimeWritePlan admission', () => {
  it('returns a recursively frozen owned snapshot through the shared kernel schema', () => {
    const source = fixture();
    const admitted = TypeValidator.validate(RuntimeWritePlanSchema, source);
    expect(admitted.ok).toBe(true);
    if (!admitted.ok) return;

    expect(admitted.value).toEqual(source);
    expect(admitted.value).not.toBe(source);
    expect(Object.isFrozen(admitted.value)).toBe(true);
    expect(Object.isFrozen(admitted.value.properties)).toBe(true);
    expect(Object.isFrozen(admitted.value.properties[0]?.from)).toBe(true);

    (source.properties[0]!.from as { parts: { args: { v: number }[] }[] }).parts[0]!.args[0]!.v = 999;
    const from = admitted.value.properties[0]!.from;
    expect(from.k === 'transform' ? (from.parts[0]!.args[0] as { v: number }).v : undefined).toBe(24);
  });

  it('rejects every malformed semantic leaf instead of admitting a later sampler crash', () => {
    const mutations: readonly ((plan: Record<string, unknown>) => void)[] = [
      (plan) => {
        plan.routing = 'sometimes';
      },
      (plan) => {
        plan.durationMs = Number.NaN;
      },
      (plan) => {
        plan.durationMs = -1;
      },
      (plan) => {
        plan.fromState = 'not a token';
      },
      (plan) => {
        (plan.easing as Record<string, unknown>).kind = 'points';
        delete (plan.easing as Record<string, unknown>).points;
      },
      (plan) => {
        (plan.windows as Record<string, unknown>[])[0]!.windowEnd = 1.1;
      },
      (plan) => {
        (plan.windows as Record<string, unknown>[])[0]!.windowStart = 0.8;
        (plan.windows as Record<string, unknown>[])[0]!.windowEnd = 0.2;
      },
      (plan) => {
        const property = (plan.properties as Record<string, unknown>[])[0]!;
        (property.from as { parts: { args: Record<string, unknown>[] }[] }).parts[0]!.args[0]!.v = Infinity;
      },
      (plan) => {
        const property = (plan.properties as Record<string, unknown>[])[0]!;
        (property.to as Record<string, unknown>).foreign = true;
      },
    ];

    for (const mutate of mutations) {
      const candidate = structuredClone(fixture()) as unknown as Record<string, unknown>;
      mutate(candidate);
      const result = TypeValidator.validate(RuntimeWritePlanSchema, candidate);
      expect(result.ok).toBe(false);
    }
  });

  it('rejects getters without invoking them', () => {
    let invoked = false;
    const candidate = structuredClone(fixture()) as unknown as Record<string, unknown>;
    Object.defineProperty(candidate, 'durationMs', {
      enumerable: true,
      get() {
        invoked = true;
        return 300;
      },
    });

    let thrown: unknown;
    try {
      decodeRuntimeWritePlan(candidate);
    } catch (error) {
      thrown = error;
    }
    expect(invoked).toBe(false);
    expect(hasTag(thrown, 'ValidationError')).toBe(true);
  });

  it('rejects cyclic transform payloads without recursing forever', () => {
    const candidate = structuredClone(fixture()) as unknown as Record<string, unknown>;
    const transform = (candidate.properties as Record<string, unknown>[])[0]!.from as Record<string, unknown>;
    const part = (transform.parts as Record<string, unknown>[])[0]!;
    (part.args as unknown[])[0] = transform;

    expect(() => decodeRuntimeWritePlan(candidate)).toThrow(/cycles are not valid motion data/);
  });
});
