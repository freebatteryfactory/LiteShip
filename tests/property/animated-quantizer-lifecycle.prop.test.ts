/**
 * AnimatedQuantizer lifecycle model — generated crossing histories prove that
 * the synchronous and replay-1 views share one landed-state authority, then
 * remain frozen after disposal. Zero-duration transitions make the model fully
 * deterministic; generated reentrant bursts exercise synchronous interruption
 * while the focused scheduler tests cover time-bearing interruption.
 *
 * @module
 */

import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { CellKernel, Millis, StateName, defineBoundary } from '@liteship/core';
import type { BoundaryCrossing, ReactiveQuantizer } from '@liteship/core';
import { AnimatedQuantizer } from '@liteship/quantizer';

const boundary = defineBoundary({
  input: 'viewport.width',
  at: [
    [0, 'compact'],
    [768, 'expanded'],
  ] as const,
});

type State = 'compact' | 'expanded';
type Crossing = BoundaryCrossing<State>;

function crossing(from: State, to: State, counter: number): Crossing {
  return {
    from: StateName(from),
    to: StateName(to),
    timestamp: { wall_ms: 0, counter, node_id: 'property' } as Crossing['timestamp'],
    value: to === 'expanded' ? 900 : 100,
  };
}

describe('AnimatedQuantizer landed-state model', () => {
  test('generated crossing histories keep stateSync and state.read bisimilar before and after disposal', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(fc.constantFrom<State>('compact', 'expanded'), { maxLength: 80 }), async (targets) => {
        const changes = CellKernel.fanout<Crossing>();
        let baseState: State = 'compact';
        let evaluateCalls = 0;
        const quantizer = {
          _tag: 'Quantizer' as const,
          boundary,
          state: CellKernel.replay1<State>('compact'),
          stateSync: () => baseState,
          changes,
          evaluate: () => {
            evaluateCalls += 1;
            return baseState;
          },
        } satisfies ReactiveQuantizer<typeof boundary>;
        const animated = AnimatedQuantizer.make(
          quantizer,
          { '*': { duration: Millis(0) } },
          { compact: { opacity: 0 }, expanded: { opacity: 1 } },
        );
        let model: State = 'compact';

        for (const target of targets) {
          if (target !== model) {
            const from = model;
            baseState = target;
            changes.publish(crossing(from, target, 0));
            model = target;
          }
          expect(animated.state.read()).toBe(model);
          expect(animated.stateSync?.()).toBe(model);
        }

        await animated.dispose();
        expect(animated.state.read()).toBe(model);
        expect(animated.stateSync?.()).toBe(model);
        expect(animated.evaluate(model === 'compact' ? 900 : 100)).toBe(model);
        expect(evaluateCalls).toBe(0);
        expect(animated.state.closed).toBe(true);
        expect(animated.interpolated.closed).toBe(true);
      }),
      { seed: 0x1a11ded, numRuns: 100 },
    );
  });

  test('seeded reentrant crossing bursts are latest-wins and release every subscriber on disposal', async () => {
    const burstArbitrary = fc.array(
      fc.array(fc.constantFrom<State>('compact', 'expanded'), { minLength: 2, maxLength: 12 }),
      { minLength: 1, maxLength: 24 },
    );

    await fc.assert(
      fc.asyncProperty(burstArbitrary, async (bursts) => {
        const changes = CellKernel.fanout<Crossing>();
        let sourceState: State = 'compact';
        let counter = 0;
        const quantizer = {
          _tag: 'Quantizer' as const,
          boundary,
          state: CellKernel.replay1<State>('compact'),
          stateSync: () => sourceState,
          changes,
          evaluate: () => sourceState,
        } satisfies ReactiveQuantizer<typeof boundary>;
        const animated = AnimatedQuantizer.make(
          quantizer,
          { '*': { duration: Millis(0) } },
          { compact: { opacity: 0 }, expanded: { opacity: 1 } },
        );
        const queuedTargets: State[] = [];
        let frameCount = 0;
        const publishTarget = (target: State): void => {
          const from = sourceState;
          sourceState = target;
          changes.publish(crossing(from, target, counter++));
        };
        animated.interpolated.subscribe(() => {
          frameCount += 1;
          const target = queuedTargets.shift();
          if (target !== undefined) publishTarget(target);
        });

        let model: State = 'compact';
        for (const [first, ...rest] of bursts) {
          queuedTargets.push(...rest);
          publishTarget(first!);
          model = rest.at(-1) ?? first!;
          expect(queuedTargets).toEqual([]);
          expect(animated.state.read()).toBe(model);
          expect(animated.stateSync?.()).toBe(model);
        }

        expect(changes.size).toBe(1);
        await animated.dispose();
        const framesAtDispose = frameCount;
        expect(changes.size).toBe(0);
        expect(animated.interpolated.size).toBe(0);
        expect(animated.state.size).toBe(0);
        expect(animated.interpolated.closed).toBe(true);
        expect(animated.state.closed).toBe(true);

        publishTarget(model === 'compact' ? 'expanded' : 'compact');
        expect(frameCount).toBe(framesAtDispose);
        expect(animated.state.read()).toBe(model);
        expect(animated.stateSync?.()).toBe(model);
      }),
      { seed: 0x2a3c0de, numRuns: 100 },
    );
  });
});
