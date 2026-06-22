/**
 * Compositor -- DirtyFlags integration, pool, FrameBudget, batching.
 */

import { describe, test, expect } from 'vitest';
import { Deferred, Effect, Fiber, Stream } from 'effect';
import { Boundary, Compositor, DIRTY_FLAGS_MAX } from '@czap/core';
import type { CompositeState } from '@czap/core';
import { runScopedAsync as runScoped } from '../../helpers/effect-test.js';

const widthBoundary = Boundary.make({
  input: 'viewport.width',
  at: [
    [0, 'mobile'],
    [768, 'tablet'],
    [1024, 'desktop'],
  ] as const,
});

function makeQuantizer(boundary: Boundary.Shape, initialState?: string) {
  let currentState = initialState ?? (boundary.states[0] as string);
  return {
    boundary,
    state: Effect.succeed(currentState),
    changes: null as any, // Not used in these tests
    evaluate(value: number) {
      currentState = Boundary.evaluate(boundary, value) as string;
      return currentState;
    },
    _setState(s: string) {
      currentState = s;
    },
  };
}

describe('Compositor', () => {
  describe('basic operations', () => {
    test('create returns a compositor', async () => {
      const compositor = await runScoped(Compositor.create());
      expect(compositor).toBeDefined();
      expect(compositor.add).toBeDefined();
      expect(compositor.remove).toBeDefined();
      expect(compositor.compute).toBeDefined();
    });

    test('compute on empty compositor returns empty state', async () => {
      const compositor = await runScoped(Compositor.create());
      const state = await Effect.runPromise(compositor.compute());
      expect(state.discrete).toEqual({});
      expect(state.outputs.css).toEqual({});
    });

    test('add quantizer and compute produces output', async () => {
      const compositor = await runScoped(Compositor.create());
      const q = makeQuantizer(widthBoundary, 'mobile');

      await Effect.runPromise(compositor.add('layout', q));
      const state = await Effect.runPromise(compositor.compute());

      expect(state.discrete['layout']).toBe('mobile');
      expect(state.outputs.css['--czap-layout']).toBe('mobile');
      expect(state.outputs.glsl['u_layout']).toBe(0);
      expect(state.outputs.aria['data-czap-layout']).toBe('mobile');
    });

    test('remove quantizer clears its output', async () => {
      const compositor = await runScoped(Compositor.create());
      const q = makeQuantizer(widthBoundary, 'tablet');

      await Effect.runPromise(compositor.add('layout', q));
      await Effect.runPromise(compositor.remove('layout'));
      const state = await Effect.runPromise(compositor.compute());

      expect(state.discrete['layout']).toBeUndefined();
    });
  });

  describe('DirtyFlags integration', () => {
    test('only dirty quantizers recompute', async () => {
      const compositor = await runScoped(Compositor.create());
      const q1 = makeQuantizer(widthBoundary, 'mobile');
      const q2 = makeQuantizer(widthBoundary, 'tablet');

      await Effect.runPromise(compositor.add('q1', q1));
      await Effect.runPromise(compositor.add('q2', q2));

      // First compute should include both
      const state1 = await Effect.runPromise(compositor.compute());
      expect(state1.discrete['q1']).toBe('mobile');
      expect(state1.discrete['q2']).toBe('tablet');

      // Change q1's state, mark dirty via setBlendWeights
      q1._setState('desktop');
      await Effect.runPromise(compositor.setBlendWeights('q1', { desktop: 1 }));

      // Compute — q2 should still be present from previous state
      const state2 = await Effect.runPromise(compositor.compute());
      expect(state2.discrete['q2']).toBe('tablet');
      expect(state2.blend['q1']).toEqual({ desktop: 1 });
    });
  });

  describe('blend weights', () => {
    test('setBlendWeights overrides auto-computed weights', async () => {
      const compositor = await runScoped(Compositor.create());
      const q = makeQuantizer(widthBoundary, 'mobile');

      await Effect.runPromise(compositor.add('layout', q));
      await Effect.runPromise(compositor.setBlendWeights('layout', { mobile: 0.5, tablet: 0.5 }));

      const state = await Effect.runPromise(compositor.compute());
      expect(state.blend['layout']).toEqual({ mobile: 0.5, tablet: 0.5 });
    });
  });

  describe('pool integration', () => {
    test('custom pool capacity is accepted', async () => {
      const compositor = await runScoped(Compositor.create({ poolCapacity: 4 }));
      expect(compositor).toBeDefined();
    });
  });

  describe('scheduleBatch', () => {
    test('scheduleBatch is callable', async () => {
      const compositor = await runScoped(Compositor.create());
      // Should not throw
      compositor.scheduleBatch();
    });

    test('scheduleBatch coalesces duplicate calls in the same microtask turn', async () => {
      const compositor = await runScoped(Compositor.create());
      const q = makeQuantizer(widthBoundary, 'mobile');

      await Effect.runPromise(compositor.add('layout', q));
      compositor.scheduleBatch();
      compositor.scheduleBatch();
      await Promise.resolve();

      const state = await Effect.runPromise(compositor.compute());
      expect(state.discrete['layout']).toBe('mobile');
    });
  });

  describe('runtime hot-path branches', () => {
    test('respects frame-budget gating for glsl and aria emission', async () => {
      const compositor = await runScoped(
        Compositor.create({
          frameBudget: {
            canRun(priority: string) {
              return priority === 'medium';
            },
          } as never,
        }),
      );
      const q = makeQuantizer(widthBoundary, 'tablet');

      await Effect.runPromise(compositor.add('layout', q));
      const state = await Effect.runPromise(compositor.compute());

      expect(state.outputs.css['--czap-layout']).toBe('tablet');
      expect(state.outputs.glsl['u_layout']).toBeUndefined();
      expect(state.outputs.aria['data-czap-layout']).toBeUndefined();
    });

    test('uses speculative prefetched states and clears them when confidence drops', async () => {
      const compositor = await runScoped(Compositor.create({ speculative: true }));
      const q = makeQuantizer(widthBoundary, 'mobile');

      await Effect.runPromise(compositor.add('layout', q));

      compositor.evaluateSpeculative('layout', 767.9, 1);
      let state = await Effect.runPromise(compositor.compute());
      expect(state.discrete['layout']).toBe('tablet');

      q._setState('mobile');
      compositor.evaluateSpeculative('layout', 640, 0);
      await Effect.runPromise(compositor.setBlendWeights('layout', { mobile: 1 }));
      state = await Effect.runPromise(compositor.compute());
      expect(state.discrete['layout']).toBe('mobile');
    });

    test('prefers stateSync and tolerates undefined discrete states on the emit path', async () => {
      const compositor = await runScoped(Compositor.create());
      const q = {
        ...makeQuantizer(widthBoundary, 'mobile'),
        stateSync: () => undefined as unknown as string,
      };

      await Effect.runPromise(compositor.add('layout', q as never));
      const state = await Effect.runPromise(compositor.compute());

      expect(state.discrete['layout']).toBeUndefined();
      expect(state.outputs.css['--czap-layout']).toBeUndefined();
      expect(state.outputs.aria['data-czap-layout']).toBeUndefined();
      expect(state.outputs.glsl['u_layout']).toBe(0);
      expect(state.blend['layout']).toEqual({});
    });

    test('recompute-all mode stays stable after exceeding the dirty-flag capacity', async () => {
      const compositor = await runScoped(Compositor.create({ speculative: true }));

      for (let index = 0; index <= DIRTY_FLAGS_MAX; index++) {
        await Effect.runPromise(compositor.add(`q${index}`, makeQuantizer(widthBoundary, 'mobile')));
      }

      compositor.evaluateSpeculative('q0', 767.9, 1);
      const state = await Effect.runPromise(compositor.compute());

      expect(Object.keys(state.discrete)).toHaveLength(DIRTY_FLAGS_MAX + 1);
      expect(state.discrete['q0']).toBe('tablet');
    });

    test('duplicate adds preserve runtime state both before and after dirty flags fall back to recompute-all mode', async () => {
      const compositor = await runScoped(Compositor.create());
      const first = makeQuantizer(widthBoundary, 'mobile');
      const second = makeQuantizer(widthBoundary, 'tablet');

      await Effect.runPromise(compositor.add('layout', first));
      await Effect.runPromise(compositor.add('layout', second));
      let state = await Effect.runPromise(compositor.compute());

      expect(state.discrete['layout']).toBe('tablet');
      expect(state.blend['layout']).toEqual({ tablet: 1, mobile: 0, desktop: 0 });

      const recomputeAll = await runScoped(Compositor.create());
      for (let index = 0; index <= DIRTY_FLAGS_MAX; index++) {
        await Effect.runPromise(recomputeAll.add(`q${index}`, makeQuantizer(widthBoundary, 'mobile')));
      }

      await Effect.runPromise(recomputeAll.add('q0', makeQuantizer(widthBoundary, 'desktop')));
      state = await Effect.runPromise(recomputeAll.compute());

      expect(state.discrete['q0']).toBe('desktop');
      expect(state.blend['q0']).toEqual({ mobile: 0, tablet: 0, desktop: 1 });
    });
  });

  describe('multiple quantizers', () => {
    test('handles multiple quantizers correctly', async () => {
      const compositor = await runScoped(Compositor.create());

      const colorBoundary = Boundary.make({
        input: 'prefers-color-scheme',
        at: [
          [0, 'light'],
          [1, 'dark'],
        ] as const,
      });

      const q1 = makeQuantizer(widthBoundary, 'tablet');
      const q2 = makeQuantizer(colorBoundary, 'light');

      await Effect.runPromise(compositor.add('layout', q1));
      await Effect.runPromise(compositor.add('theme', q2));

      const state = await Effect.runPromise(compositor.compute());
      expect(state.discrete['layout']).toBe('tablet');
      expect(state.discrete['theme']).toBe('light');
      expect(state.outputs.css['--czap-layout']).toBe('tablet');
      expect(state.outputs.css['--czap-theme']).toBe('light');
    });
  });

  describe('changes stream (reactive contract preserved after the zero-alloc publish)', () => {
    // The reactive publish was changed from `SubscriptionRef.set` to a raw
    // listener-set fan-out (zero-transient). These pin that the `changes`
    // Stream<CompositeState> contract is UNCHANGED: replay-current-on-subscribe,
    // ordered delivery of every subsequent compose, and per-subscriber fan-out.
    //
    // NOTE on payload: `changes` delivers the POOLED CompositeState reference (which
    // the two-slot rotation recycles a tick later), so an ASYNC consumer reads it
    // after recycle and sees the cleared object — a PRE-EXISTING property of the
    // pool-backed publish, identical under the old `SubscriptionRef.set` (verified
    // against the original). These tests therefore assert the NOTIFICATION contract
    // (delivery count, ordering, well-formed shape, fan-out) — the publish-mechanism
    // change — not the pooled payload (unchanged + out of scope).
    // Race-free handshake: a forked subscriber resolves `registered` the moment its
    // FIRST element (the on-attach replay) arrives — which can only happen after the
    // `Stream.callback` listener is in the set. The driver awaits `registered` before
    // composing, so no compose is ever published before the subscriber can see it. No
    // sleep, no timing assumption (the old `Effect.sleep` raced under load).
    test('a subscriber replays the current state on attach, then receives each subsequent compose', async () => {
      const received = await Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* () {
            const compositor = yield* Compositor.create();
            yield* compositor.add('layout', makeQuantizer(widthBoundary, 'mobile'));
            // `add` composed once; the current live state is now published.

            const registered = yield* Deferred.make<void>();
            const collected: CompositeState[] = [];
            const fiber = yield* Effect.forkChild(
              compositor.changes.pipe(
                Stream.take(3), // replay + two composes
                Stream.runForEach((state) =>
                  Effect.gen(function* () {
                    collected.push(state);
                    if (collected.length === 1) yield* Deferred.succeed(registered, undefined);
                  }),
                ),
              ),
            );

            // Block until the subscriber is registered + has replayed the current state.
            yield* Deferred.await(registered);

            // Now drive two more composes — guaranteed observed by the subscriber.
            yield* compositor.remove('layout');
            yield* compositor.add('layout', makeQuantizer(widthBoundary, 'tablet'));
            compositor.runtime.markDirty('layout');
            yield* compositor.compute();

            yield* Fiber.join(fiber);
            return collected;
          }),
        ),
      );

      // Replay (1) + two composes (2) = 3 ordered emissions, each a well-formed
      // CompositeState — the notification contract the publish change preserves.
      expect(received.length).toBe(3);
      for (const s of received) {
        expect(s).toBeDefined();
        expect(s.discrete).toBeDefined();
        expect(s.outputs.css).toBeDefined();
        expect(s.outputs.glsl).toBeDefined();
        expect(s.outputs.aria).toBeDefined();
      }
    });

    test('two subscribers each receive the same number of composes (fan-out)', async () => {
      const [a, b] = await Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* () {
            const compositor = yield* Compositor.create();
            yield* compositor.add('layout', makeQuantizer(widthBoundary, 'mobile'));

            // Each subscriber signals registration on its own replay; the driver waits
            // for BOTH before composing (race-free fan-out, no sleep).
            const subscriber = (registered: Deferred.Deferred<void>) => {
              const collected: CompositeState[] = [];
              return Effect.forkChild(
                compositor.changes.pipe(
                  Stream.take(2), // replay + one compose
                  Stream.runForEach((state) =>
                    Effect.gen(function* () {
                      collected.push(state);
                      if (collected.length === 1) yield* Deferred.succeed(registered, undefined);
                    }),
                  ),
                ),
              ).pipe(Effect.map((fiber) => ({ fiber, collected })));
            };

            const ra = yield* Deferred.make<void>();
            const rb = yield* Deferred.make<void>();
            const a = yield* subscriber(ra);
            const b = yield* subscriber(rb);
            yield* Deferred.await(ra);
            yield* Deferred.await(rb);

            yield* compositor.remove('layout');
            yield* compositor.add('layout', makeQuantizer(widthBoundary, 'desktop')); // one more compose

            yield* Fiber.join(a.fiber);
            yield* Fiber.join(b.fiber);
            return [a.collected, b.collected] as const;
          }),
        ),
      );

      // Both subscribers independently see replay + the one compose = 2 emissions
      // each — the per-subscriber fan-out the listener-set publish preserves.
      expect(a.length).toBe(2);
      expect(b.length).toBe(2);
      for (const s of [...a, ...b]) {
        expect(s.discrete).toBeDefined();
        expect(s.outputs.css).toBeDefined();
      }
    });
  });
});
