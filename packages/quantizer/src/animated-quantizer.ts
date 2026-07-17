/**
 * AnimatedQuantizer -- wraps a Quantizer with Transitions.
 * On boundary crossing, interpolates between old and new output values
 * over the configured transition duration/easing.
 */

import type {
  Boundary,
  StateUnion,
  BoundaryCrossing,
  Quantizer,
  ReactiveQuantizer,
  Easing,
  Scheduler,
} from '@czap/core';
import { Diagnostics, systemClock, Animation, Millis as mkMillis, CellKernel, Lifetime } from '@czap/core';
import type { Transition, TransitionMap } from './transition.js';
import { Transition as TransitionFactory } from './transition.js';

// ---------------------------------------------------------------------------
// Animated quantizer interface
// ---------------------------------------------------------------------------

/** An interpolated animation frame emitted during a crossing. */
export interface InterpolatedFrame<B extends Boundary.Shape> {
  /** Target state of the in-flight transition. */
  readonly state: StateUnion<B>;
  /** Progress in `[0, 1]`, where `1` means the animation has landed. */
  readonly progress: number;
  /** Interpolated output record for the current frame. */
  readonly outputs: Record<string, number | string>;
}

/**
 * Quantizer augmented with transition-aware output interpolation.
 *
 * The `interpolated` no-replay {@link CellKernel} fan-out publishes a frame on
 * each animation tick containing the target state, normalized progress (0-1),
 * and the current lerped output record. Non-numeric values snap at the 50% mark.
 * Subscribe via `interpolated.subscribe(sink)`; a late subscriber never sees a
 * frame published before it attached.
 */
export interface AnimatedQuantizerShape<B extends Boundary.Shape> extends ReactiveQuantizer<B> {
  /** Resolver that maps `from -> to` crossings to {@link TransitionConfig}. */
  readonly transition: Transition<B>;
  /** No-replay subscription of interpolated animation frames during crossings. */
  readonly interpolated: Pick<CellKernel.Fanout<InterpolatedFrame<B>>, 'subscribe' | 'closed' | 'size'>;
}

/**
 * The pair {@link AnimatedQuantizer.make} returns: the live animated quantizer
 * plus the {@link Lifetime} that owns its teardown. Dispose the lifetime to stop
 * observing the wrapped quantizer's crossings, abort any in-flight animation, and
 * close the `interpolated` fan-out (completing subscribers, making publish inert).
 */
export interface AnimatedQuantizerHandle<B extends Boundary.Shape> {
  readonly animated: AnimatedQuantizerShape<B>;
  readonly lifetime: Lifetime.Shape;
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
 * A `setTimeout`-backed sleep that also settles early when `signal` aborts — the
 * plain-async replacement for the old `Effect.sleep` legs of the delay pre-roll
 * and the self-driven 16ms loop. An interrupting crossing (or lifetime dispose)
 * aborts the signal, so a pending sleep resolves promptly and the loop that owns
 * it re-checks `signal.aborted` and stops.
 */
function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise<void>((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const onAbort = (): void => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Create an animated quantizer that interpolates outputs during transitions.
 *
 * Wraps an existing {@link ReactiveQuantizer} and applies easing/duration-based
 * interpolation between old and new output values when a boundary crossing
 * occurs. Publishes an `interpolated` fan-out of frames with progress and lerped
 * numeric outputs — at ~60fps by default, or on the cadence of an injected
 * `options.scheduler` (`raf` / `fixedStep` / `audioSync`).
 *
 * The wrapped quantizer's crossings are observed eagerly (one shared
 * subscription): each crossing interrupts the prior animation via a per-crossing
 * {@link AbortController} — aborting breaks the `for await` over
 * {@link Animation.run}, whose `finally` cancels the pending scheduler tick — and
 * starts a fresh animation. Dispose the returned {@link Lifetime} to detach the
 * crossing subscription, abort the in-flight animation, and close the fan-out.
 *
 * @example
 * ```ts
 * import { Boundary, Millis } from '@czap/core';
 * import { Q, AnimatedQuantizer } from '@czap/quantizer';
 *
 * const boundary = Boundary.make({
 *   input: 'scroll',
 *   at: [[0, 'top'], [500, 'bottom']],
 * });
 * const config = Q.from(boundary).outputs({
 *   css: { top: { opacity: '1' }, bottom: { opacity: '0.5' } },
 * });
 * const { quantizer: live } = config.create();
 * // outputs omitted: derived from the LiveQuantizer's css output tables
 * const { animated, lifetime } = AnimatedQuantizer.make(live, { '*': { duration: Millis(300) } });
 * const dispose = animated.interpolated.subscribe((frame) => { ... });
 * live.evaluate(600); // triggers interpolation
 * ```
 *
 * @param quantizer   - The reactive quantizer to wrap
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
 * @returns An {@link AnimatedQuantizerHandle} — the instance plus its {@link Lifetime}
 */
function makeAnimatedQuantizer<B extends Boundary.Shape>(
  quantizer: ReactiveQuantizer<B>,
  transitions: TransitionMap<StateUnion<B> & string>,
  outputs?: Record<string, Record<string, number | string>>,
  options?: { readonly scheduler?: Scheduler.Shape },
): AnimatedQuantizerHandle<B> {
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

  const initialState: StateUnion<B> = quantizer.state.read();

  // Reactive substrate on the extracted CellKernel (was SubscriptionRef / Queue /
  // Stream.callback): a replay-1 landed-state slot and a no-replay frame fan-out.
  const stateCell = CellKernel.replay1<StateUnion<B>>(initialState);
  const frames = CellKernel.fanout<InterpolatedFrame<B>>();

  // Live interpolated value (was currentOutputsRef) — an interrupting crossing
  // reads it so a new animation lerps FROM the frame the prior one landed on.
  let currentOutputs: Record<string, number | string> = effectiveOutputs?.[initialState as string] ?? {};
  // The in-flight animation's abort handle (was currentFiberRef) — one
  // AbortController per crossing; a new crossing aborts the prior.
  let currentAbort: AbortController | null = null;

  /**
   * Run one crossing's animation to completion (or until `signal` aborts). The
   * `for await` over {@link Animation.run} is broken by `return`-on-abort, whose
   * generator `finally` cancels the pending scheduler tick.
   */
  async function runAnimation(
    signal: AbortSignal,
    to: StateUnion<B>,
    duration: number,
    easing: Easing.Fn,
    delay: number,
    fromOutputs: Record<string, number | string>,
    toOutputs: Record<string, number | string>,
  ): Promise<void> {
    if (delay > 0) {
      if (scheduler !== undefined) {
        // Honor the pre-roll on the SAME injected clock so a fixedStep
        // render/test stays deterministic — a wall-clock sleep here would desync
        // the delay from the scheduled frames. Drain a delay-length Animation.run
        // on the scheduler (frames discarded); abort breaks it (cancels the tick).
        for await (const _frame of Animation.run({ duration: mkMillis(delay), easing: linearEasing, scheduler })) {
          void _frame;
          if (signal.aborted) return;
        }
      } else {
        await sleep(delay, signal);
      }
      if (signal.aborted) return;
    }

    if (duration <= 0) {
      frames.publish({ state: to, progress: 1, outputs: toOutputs });
      currentOutputs = toOutputs;
      stateCell.publish(to);
      return;
    }

    if (scheduler !== undefined) {
      // Injected frame clock (rAF / fixedStep / audioSync): delegate the cadence
      // to the proven Animation.run loop instead of the fixed 16ms sleep. Each
      // frame publishes currentOutputs so an interrupting crossing reads the live
      // interpolated value; abort breaks the loop and cancels the pending tick.
      for await (const frame of Animation.run({ duration: mkMillis(duration), easing, scheduler })) {
        if (signal.aborted) return;
        const interpolated = lerpOutputs(fromOutputs, toOutputs, frame.eased);
        currentOutputs = interpolated;
        frames.publish({ state: to, progress: frame.progress, outputs: interpolated });
      }
    } else {
      // Default: self-driven time-sliced animation loop (~60fps via 16ms sleep).
      const startTime = nowMs();
      let progress = 0;
      while (progress < 1) {
        if (signal.aborted) return;
        const elapsed = nowMs() - startTime;
        progress = Math.min(elapsed / duration, 1);
        const eased = easing(progress);
        const interpolated = lerpOutputs(fromOutputs, toOutputs, eased);
        currentOutputs = interpolated;
        frames.publish({ state: to, progress, outputs: interpolated });

        if (progress < 1) {
          await sleep(16, signal);
        }
      }
    }

    if (signal.aborted) return;
    currentOutputs = toOutputs;
    stateCell.publish(to);
  }

  /** Interrupt the prior animation and start a fresh one for `crossing`. */
  function startAnimation(crossing: BoundaryCrossing<StateUnion<B> & string>): void {
    // Interrupt-previous: abort the in-flight animation's controller.
    currentAbort?.abort();
    const controller = new AbortController();
    currentAbort = controller;

    // crossing.from/to are StateName<StateUnion<B> & string>, a branded subtype
    // of StateUnion<B>; assignable directly without a cast.
    const { from, to } = crossing;
    const config = transitionResolver.getTransition(from, to);
    const duration = config.duration;
    const easing = config.easing ?? linearEasing;
    const delay = config.delay ?? 0;

    const fromOutputs = { ...currentOutputs };
    const toOutputs: Record<string, number | string> = effectiveOutputs?.[crossing.to as string] ?? {};

    // Fire-and-forget: the animation drives itself off the scheduler/timers and
    // publishes frames to the fan-out. Its own `signal` checks stop it on
    // interrupt or dispose; failures are swallowed (there is no consumer to fail).
    void runAnimation(controller.signal, to, duration, easing, delay, fromOutputs, toOutputs).catch(() => undefined);
  }

  // Eagerly observe the wrapped quantizer's crossings (was the lazy
  // Stream.callback + Stream.runForEach): one shared subscription drives the
  // single frame fan-out.
  const unsubscribe = quantizer.changes.subscribe((crossing) => startAnimation(crossing));

  const lifetime = Lifetime.make();
  lifetime.add(() => {
    unsubscribe();
    currentAbort?.abort();
    frames.close();
    stateCell.close();
  });

  const animated: AnimatedQuantizerShape<B> = {
    _tag: 'Quantizer',
    boundary,
    transition: transitionResolver,
    state: stateCell,
    stateSync: quantizer.stateSync ? () => quantizer.stateSync!() : undefined,
    changes: quantizer.changes,
    evaluate(value: number): StateUnion<B> {
      return quantizer.evaluate(value);
    },
    interpolated: frames,
  };

  return { animated, lifetime };
}

// ---------------------------------------------------------------------------
// AnimatedQuantizer module object
// ---------------------------------------------------------------------------

/**
 * Animated quantizer namespace.
 *
 * Wraps a reactive quantizer with transition-aware interpolation. When a
 * boundary crossing occurs, numeric output values are lerped over a configurable
 * duration and easing curve. Non-numeric values snap at the 50% mark.
 * The `interpolated` fan-out publishes frames containing progress (0-1) and
 * the current interpolated output record.
 *
 * @example
 * ```ts
 * import { Boundary, Millis } from '@czap/core';
 * import { Q, AnimatedQuantizer } from '@czap/quantizer';
 *
 * const boundary = Boundary.make({
 *   input: 'scroll',
 *   at: [[0, 'top'], [500, 'bottom']],
 * });
 * const config = Q.from(boundary).outputs({});
 * const { quantizer: live } = config.create();
 * const { animated, lifetime } = AnimatedQuantizer.make(live, { '*': { duration: Millis(200) } });
 * animated.transition; // TransitionResolver
 * await lifetime.dispose();
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
