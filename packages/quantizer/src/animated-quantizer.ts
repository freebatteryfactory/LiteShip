/**
 * AnimatedQuantizer -- wraps a Quantizer with Transitions.
 * On boundary crossing, interpolates between old and new output values
 * over the configured transition duration/easing.
 */

import type { Scope } from 'effect';
import { Effect, Stream, SubscriptionRef, Queue, Fiber, Ref, Duration } from 'effect';
import type { Boundary, StateUnion, BoundaryCrossing, Quantizer, Easing, Scheduler } from '@czap/core';
import { Diagnostics, systemClock, Animation, Millis as mkMillis } from '@czap/core';
import type { Transition, TransitionMap } from './transition.js';
import { Transition as TransitionFactory } from './transition.js';

// ---------------------------------------------------------------------------
// Animated quantizer interface
// ---------------------------------------------------------------------------

/**
 * Quantizer augmented with transition-aware output interpolation.
 *
 * The `interpolated` stream emits a frame on each animation tick containing
 * the target state, normalized progress (0-1), and the current lerped
 * output record. Non-numeric values snap at the 50% mark.
 */
export interface AnimatedQuantizerShape<B extends Boundary.Shape> extends Quantizer<B> {
  /** Resolver that maps `from -> to` crossings to {@link TransitionConfig}. */
  readonly transition: Transition<B>;
  /** Stream of interpolated animation frames during crossings. */
  readonly interpolated: Stream.Stream<{
    /** Target state of the in-flight transition. */
    readonly state: StateUnion<B>;
    /** Progress in `[0, 1]`, where `1` means the animation has landed. */
    readonly progress: number;
    /** Interpolated output record for the current frame. */
    readonly outputs: Record<string, number | string>;
  }>;
}

// ---------------------------------------------------------------------------
// Linear easing fallback
// ---------------------------------------------------------------------------

const linearEasing: Easing.Fn = (t: number) => t;

// ---------------------------------------------------------------------------
// Interpolate numeric values between two output records
// ---------------------------------------------------------------------------

function lerpOutputs(
  from: Record<string, number | string>,
  to: Record<string, number | string>,
  t: number,
): Record<string, number | string> {
  const result: Record<string, number | string> = {};
  const allKeys = new Set([...Object.keys(from), ...Object.keys(to)]);
  for (const key of allKeys) {
    const a = from[key];
    const b = to[key];
    if (typeof a === 'number' && typeof b === 'number') {
      result[key] = a + (b - a) * t;
    } else {
      // Non-numeric values snap to target at progress >= 0.5
      result[key] = (t < 0.5 ? (a ?? b) : (b ?? a)) as number | string;
    }
  }
  return result;
}

function nowMs(): number {
  // Animation timing rides the one audited wall-clock boundary; systemClock
  // already prefers performance.now() and falls back to Date.now() under the
  // hood, so the worker/SSR guard lives there rather than being re-hand-rolled.
  return systemClock.now();
}

// ---------------------------------------------------------------------------
// Derive interpolation outputs from a LiveQuantizer's CSS output tables
// ---------------------------------------------------------------------------

/**
 * When the wrapped quantizer is a {@link LiveQuantizer} (carries `.config`),
 * its `outputs.css` tables already hold the per-state values the user wants
 * animated — derive the interpolation record from them instead of demanding
 * a restated copy. Finite-numeric strings (`'1'`, `'0.5'`) are coerced via
 * `Number()` so they lerp; other strings pass through and snap at 50%.
 */
function deriveInterpolationOutputs<B extends Boundary.Shape>(
  quantizer: Quantizer<B>,
): Record<string, Record<string, number | string>> | undefined {
  if (!('config' in quantizer)) return undefined;
  const css = (quantizer as { config: { outputs: { css?: Record<string, Record<string, string | number>> } } }).config
    .outputs.css;
  if (css === undefined) return undefined;

  const derived: Record<string, Record<string, number | string>> = {};
  for (const [state, props] of Object.entries(css)) {
    const mapped: Record<string, number | string> = {};
    for (const [key, value] of Object.entries(props)) {
      if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
        mapped[key] = Number(value);
      } else {
        mapped[key] = value;
      }
    }
    derived[state] = mapped;
  }
  return derived;
}

// ---------------------------------------------------------------------------
// Factory (internal impl)
// ---------------------------------------------------------------------------

/**
 * Create an animated quantizer that interpolates outputs during transitions.
 *
 * Wraps an existing {@link Quantizer} and applies easing/duration-based
 * interpolation between old and new output values when a boundary crossing
 * occurs. Produces an `interpolated` stream of frames with progress and
 * lerped numeric outputs at ~60fps.
 *
 * @example
 * ```ts
 * import { Boundary, Millis } from '@czap/core';
 * import { Q, AnimatedQuantizer } from '@czap/quantizer';
 * import { Effect, Stream } from 'effect';
 *
 * const boundary = Boundary.make({
 *   input: 'scroll',
 *   at: [[0, 'top'], [500, 'bottom']],
 * });
 * const config = Q.from(boundary).outputs({
 *   css: { top: { opacity: '1' }, bottom: { opacity: '0.5' } },
 * });
 * const program = Effect.scoped(Effect.gen(function* () {
 *   const live = yield* config.create();
 *   // outputs omitted: derived from the LiveQuantizer's css output tables
 *   const animated = yield* AnimatedQuantizer.make(
 *     live,
 *     { '*': { duration: Millis(300) } },
 *   );
 *   live.evaluate(600); // triggers interpolation
 *   return animated;
 * }));
 * ```
 *
 * @param quantizer   - The base quantizer to wrap
 * @param transitions - Map of state transition configs keyed by `from->to` pattern
 * @param outputs     - Per-state numeric output maps for interpolation; omitted,
 *                      they are derived from the wrapped LiveQuantizer's
 *                      `config.outputs.css` tables (finite-numeric strings are
 *                      coerced to numbers so they lerp)
 * @param options     - Optional injection bag. `options.scheduler` supplies a
 *                      `Scheduler.Shape` frame clock (e.g. `Scheduler.raf()`
 *                      to align frames to the display, or `Scheduler.fixedStep(fps)`
 *                      for deterministic rendering/tests). Omitted, the animation
 *                      drives its own internal ~60fps loop via a fixed 16ms sleep
 *                      (the historical default — existing callers are unchanged).
 * @returns An Effect yielding an {@link AnimatedQuantizerShape} (scoped)
 */
function makeAnimatedQuantizer<B extends Boundary.Shape>(
  quantizer: Quantizer<B>,
  transitions: TransitionMap<StateUnion<B> & string>,
  outputs?: Record<string, Record<string, number | string>>,
  options?: { readonly scheduler?: Scheduler.Shape },
): Effect.Effect<AnimatedQuantizerShape<B>, never, Scope.Scope> {
  return Effect.gen(function* () {
    const boundary = quantizer.boundary;
    const scheduler = options?.scheduler;
    const transitionResolver = TransitionFactory.for(quantizer, transitions);
    const effectiveOutputs = outputs ?? deriveInterpolationOutputs(quantizer);

    if (effectiveOutputs !== undefined) {
      // A state with no outputs entry lerps to an empty record — properties
      // just vanish at the 50% snap. Diff once at make() time, not per frame.
      const stateNames = boundary.states as readonly string[];
      const uncovered = stateNames.filter((s) => effectiveOutputs[s] === undefined);
      if (uncovered.length > 0) {
        Diagnostics.warn({
          source: 'czap/quantizer',
          code: 'uncovered-animation-states',
          message: `AnimatedQuantizer outputs cover [${Object.keys(effectiveOutputs).join(', ')}] but boundary "${boundary.input}" has states [${stateNames.join(', ')}]; transitions into ${uncovered.map((s) => `'${s}'`).join(', ')} will animate to empty outputs.`,
        });
      }
    }

    const initialState: StateUnion<B> = yield* quantizer.state;
    const stateRef = yield* SubscriptionRef.make<StateUnion<B>>(initialState);

    type InterpolatedFrame = {
      readonly state: StateUnion<B>;
      readonly progress: number;
      readonly outputs: Record<string, number | string>;
    };

    const currentOutputsRef = yield* Ref.make<Record<string, number | string>>(
      effectiveOutputs?.[initialState as string] ?? {},
    );
    const currentFiberRef = yield* Ref.make<Fiber.Fiber<void> | null>(null);

    const interpolatedStream: Stream.Stream<InterpolatedFrame> = Stream.callback<InterpolatedFrame>((queue) =>
      Effect.gen(function* () {
        yield* Effect.addFinalizer(() =>
          Effect.gen(function* () {
            const currentFiber = yield* Ref.get(currentFiberRef);
            if (currentFiber !== null) {
              yield* Fiber.interrupt(currentFiber);
            }
          }),
        );

        yield* Stream.runForEach(quantizer.changes, (crossing: BoundaryCrossing<StateUnion<B> & string>) =>
          Effect.gen(function* () {
            const existingFiber = yield* Ref.get(currentFiberRef);
            if (existingFiber !== null) {
              yield* Fiber.interrupt(existingFiber);
            }

            // crossing.from/to are StateName<StateUnion<B> & string>, which is a branded
            // subtype of StateUnion<B>; assignable directly without a cast.
            const { from, to } = crossing;
            const config = transitionResolver.getTransition(from, to);
            const duration = config.duration;
            const easing = config.easing ?? linearEasing;
            const delay = config.delay ?? 0;

            const fromOutputs = { ...(yield* Ref.get(currentOutputsRef)) };
            const toOutputs: Record<string, number | string> = effectiveOutputs?.[crossing.to as string] ?? {};

            const animationLoop = Effect.gen(function* () {
              if (delay > 0) {
                yield* Effect.sleep(Duration.millis(delay));
              }

              if (duration <= 0) {
                Queue.offerUnsafe(queue, { state: to, progress: 1, outputs: toOutputs });
                yield* Ref.set(currentOutputsRef, toOutputs);
                yield* SubscriptionRef.set(stateRef, to);
                return;
              }

              if (scheduler !== undefined) {
                // Injected frame clock (rAF / fixedStep / audioSync): delegate the
                // cadence to the proven Animation.run scheduler loop instead of the
                // fixed 16ms sleep. Each frame still publishes currentOutputsRef so
                // an interrupting crossing reads the live interpolated value, and
                // the stream's finalizer cancels the pending tick on interrupt.
                yield* Stream.runForEach(Animation.run({ duration: mkMillis(duration), easing, scheduler }), (frame) =>
                  Effect.gen(function* () {
                    const interpolated = lerpOutputs(fromOutputs, toOutputs, frame.eased);
                    yield* Ref.set(currentOutputsRef, interpolated);
                    Queue.offerUnsafe(queue, { state: to, progress: frame.progress, outputs: interpolated });
                  }),
                );
              } else {
                // Default: self-driven time-sliced animation loop (~60fps via 16ms sleep).
                const startTime = nowMs();
                let progress = 0;
                while (progress < 1) {
                  const elapsed = nowMs() - startTime;
                  progress = Math.min(elapsed / duration, 1);
                  const eased = easing(progress);
                  const interpolated = lerpOutputs(fromOutputs, toOutputs, eased);
                  yield* Ref.set(currentOutputsRef, interpolated);
                  Queue.offerUnsafe(queue, { state: to, progress, outputs: interpolated });

                  if (progress < 1) {
                    yield* Effect.sleep(Duration.millis(16));
                  }
                }
              }

              yield* Ref.set(currentOutputsRef, toOutputs);
              yield* SubscriptionRef.set(stateRef, to);
            });

            const fiber = yield* Effect.forkChild(animationLoop);
            yield* Ref.set(currentFiberRef, fiber);
          }),
        );

        const finalFiber = yield* Ref.get(currentFiberRef);
        const fibers = [finalFiber].filter((fiber): fiber is Fiber.Fiber<void> => fiber !== null);
        yield* Effect.forEach(fibers, Fiber.join, { discard: true });
        yield* Ref.set(currentFiberRef, null);
      }),
    );

    const animatedQuantizer: AnimatedQuantizerShape<B> = {
      _tag: 'Quantizer',
      boundary,
      transition: transitionResolver,
      state: SubscriptionRef.get(stateRef),
      stateSync: quantizer.stateSync ? () => quantizer.stateSync!() : undefined,
      changes: quantizer.changes,
      evaluate(value: number): StateUnion<B> {
        return quantizer.evaluate(value);
      },
      interpolated: interpolatedStream,
    };

    return animatedQuantizer;
  });
}

// ---------------------------------------------------------------------------
// AnimatedQuantizer module object
// ---------------------------------------------------------------------------

/**
 * Animated quantizer namespace.
 *
 * Wraps a base quantizer with transition-aware interpolation. When a boundary
 * crossing occurs, numeric output values are lerped over a configurable
 * duration and easing curve. Non-numeric values snap at the 50% mark.
 * The `interpolated` stream emits frames containing progress (0-1) and
 * the current interpolated output record.
 *
 * @example
 * ```ts
 * import { Boundary, Millis } from '@czap/core';
 * import { Q, AnimatedQuantizer } from '@czap/quantizer';
 * import { Effect } from 'effect';
 *
 * const boundary = Boundary.make({
 *   input: 'scroll',
 *   at: [[0, 'top'], [500, 'bottom']],
 * });
 * const config = Q.from(boundary).outputs({});
 * const program = Effect.scoped(Effect.gen(function* () {
 *   const live = yield* config.create();
 *   const animated = yield* AnimatedQuantizer.make(
 *     live,
 *     { '*': { duration: Millis(200) } },
 *   );
 *   return animated.transition; // TransitionResolver
 * }));
 * ```
 */
export const AnimatedQuantizer = {
  /** Wrap a quantizer with transition-aware output interpolation. */
  make: makeAnimatedQuantizer,
} as const;

export declare namespace AnimatedQuantizer {
  /** Shape of an animated quantizer parameterized by boundary `B`. */
  export type Shape<B extends Boundary.Shape> = AnimatedQuantizerShape<B>;
}
