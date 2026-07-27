/**
 * Entry point for the `client:motion` directive — the PRODUCTION driver of the
 * continuous motion floor (#126, F-MOT-2/3).
 *
 * The native-CSS path (`MotionCompiler`) owns motion wherever `animation-timeline`
 * is supported. This directive is the permanent FLOOR for everywhere it is not: it
 * reads an SSR-inlined, already-lowered motion payload off `data-liteship-motion-payload`
 * and, when native is unavailable, scrubs the same signal→progress the CSS would,
 * writing typed leaf values through {@link writeContinuousMap} every frame. That
 * writer samples the program's OWN easing descriptor (`RuntimeWritePlan.easing`) —
 * the same `Easing.spring` the CSS `linear()` compiles from — so the JS floor and
 * native CSS read ONE identical kernel (Law 4).
 *
 * The split the runtime enforces (Law 15/16):
 *   - CONTINUOUS — the eased tween. A LEAF write every frame (`--liteship-*` custom
 *     properties + a `liteship:uniform-update`) and a continuous StateCell write. NEVER
 *     a graph patch (patching per frame would re-seal the graph 60×/s).
 *   - DISCRETE — the state CROSSING at the threshold. `data-liteship-state` flips and a
 *     `liteship:graph-state` fires through the exact seam `scene-bridge.applyDiscreteState`
 *     uses. Sparse — only on a real crossing.
 *
 * Lifecycle mirrors the other host drivers: reduced-motion + `settle` policy skips
 * the loop and pins the final endpoint once; `liteship:reinit` disposes BEFORE
 * re-reading (never double-holds); `liteship:teardown` stops the driver and frees the
 * store. SSR-safe: with no `window`/rAF the loop never starts.
 *
 * @module
 */

import {
  clamp01,
  Diagnostics,
  StateCellStore,
  resolveRevealInitialState,
  startRafLoop,
  type RevealIntent,
  type RuntimeWritePlan,
} from '@liteship/core';
import { decodeRevealIntent, decodeRuntimeWritePlan } from '@liteship/core/motion';
import { ValidationError } from '@liteship/error';
import { dispatchLiteshipEvent } from '@liteship/web';
import { writeContinuousMap } from './write-continuous-map.js';
import { attachSignalObserver, readSignalValue, warnIfSignalUnserved } from './boundary.js';
import { bootDirectiveEntry } from './directive-bound.js';

/**
 * The opt-in attribute carrying the SSR-inlined lowered motion program (JSON).
 * Presence GATES the directive — like `client:graph`'s `data-liteship-graph`, it is
 * read directly off the host, not through a wire registry.
 */
export const MOTION_PAYLOAD_ATTR = 'data-liteship-motion-payload';

/** The default discrete crossing point on RAW (un-eased) progress. */
const DEFAULT_THRESHOLD = 0.5;

/** The store cell names the directive registers on its private {@link StateCellStore}. */
const DISCRETE_CELL = 'motion';
const CONTINUOUS_CELL = 'motion.progress';

/** The canonical discrete-crossing event, shared with the scene bridge. */
const GRAPH_STATE_EVENT = 'liteship:graph-state';

/**
 * The SSR-inlined motion directive envelope the directive drives. The
 * authority (see `examples/showcase/src/server/motion-payload.ts`) lowers a
 * {@link RevealIntent} to a graph, interprets it, and serializes THIS: the reveal
 * intent (drives reduced-motion first paint) + the runtime leaf-write plan (the
 * floor, carrying its easing) + the resolved signal inputs.
 */
export interface MotionDirectivePayload {
  /** The authoring intent — drives {@link resolveRevealInitialState} for first paint. */
  readonly intent: RevealIntent;
  /** The lowered leaf-write floor, including its self-describing easing descriptor. */
  readonly runtime: RuntimeWritePlan;
  /** Resolved continuous signal inputs (e.g. `['scroll.progress']`); empty ⇒ time trigger. */
  readonly signals: readonly string[];
  /** Discrete crossing point on raw progress (default `0.5`). */
  readonly threshold?: number;
}

function invalidPayload(message: string): never {
  throw ValidationError('MotionDirectivePayload', message);
}

function payloadData(record: Record<string, unknown>, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (descriptor === undefined) return invalidPayload(`missing required field ${key}`);
  if (!('value' in descriptor)) return invalidPayload(`accessor field ${key} is not valid wire data`);
  return descriptor.value;
}

/** Strictly admit and immutably own one decoded directive payload. */
export function decodeMotionDirectivePayload(value: unknown): MotionDirectivePayload {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return invalidPayload('expected an object containing { intent, runtime, signals }');
  }
  const candidate = value as Record<string, unknown>;
  const prototype = Object.getPrototypeOf(candidate) as object | null;
  if (prototype !== Object.prototype && prototype !== null) {
    return invalidPayload('custom prototypes are not valid wire data');
  }
  if (Object.getOwnPropertySymbols(candidate).some((symbol) => Object.propertyIsEnumerable.call(candidate, symbol))) {
    return invalidPayload('enumerable symbol fields are not valid wire data');
  }
  const allowed = new Set(['intent', 'runtime', 'signals', 'threshold']);
  const foreign = Object.keys(candidate).find((key) => !allowed.has(key));
  if (foreign !== undefined) return invalidPayload(`unknown field ${foreign}`);
  const intent = payloadData(candidate, 'intent');
  const runtime = payloadData(candidate, 'runtime');
  const signals = payloadData(candidate, 'signals');
  const thresholdDescriptor = Object.getOwnPropertyDescriptor(candidate, 'threshold');
  if (thresholdDescriptor !== undefined && !('value' in thresholdDescriptor)) {
    return invalidPayload('accessor field threshold is not valid wire data');
  }
  const threshold = thresholdDescriptor === undefined ? undefined : thresholdDescriptor.value;
  if (!Array.isArray(signals) || !signals.every((signal) => typeof signal === 'string' && signal.trim() !== '')) {
    return invalidPayload('signals must be an array of non-empty strings');
  }
  if (
    threshold !== undefined &&
    (typeof threshold !== 'number' || !Number.isFinite(threshold) || threshold < 0 || threshold > 1)
  ) {
    return invalidPayload('threshold must be a finite number in [0,1]');
  }
  return Object.freeze({
    intent: decodeRevealIntent(intent),
    runtime: decodeRuntimeWritePlan(runtime),
    signals: Object.freeze([...signals]),
    ...(threshold !== undefined ? { threshold } : {}),
  });
}

/** Serialize only a payload that satisfies the same admission law as the runtime reader. */
export function serializeMotionDirectivePayload(value: unknown): string {
  return JSON.stringify(decodeMotionDirectivePayload(value));
}

/**
 * Parse the inlined program, returning `null` LOUDLY on any malformed payload so
 * the directive stays inert and the native/CSS floor is unaffected (Law 1).
 */
export function parseMotionDirectivePayload(raw: string): MotionDirectivePayload | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (cause) {
    Diagnostics.warnOnceRegistered({
      source: 'liteship/astro.motion',
      code: 'astro/motion/motion-program-malformed',
      message: `${MOTION_PAYLOAD_ATTR} was not valid JSON — the client:motion floor stays inert; native CSS still applies. Serialize through serializeMotionDirectivePayload.`,
      cause,
    });
    return null;
  }

  try {
    return decodeMotionDirectivePayload(parsed);
  } catch {
    Diagnostics.warnOnceRegistered({
      source: 'liteship/astro.motion',
      code: 'astro/motion/motion-program-shape-invalid',
      message: `${MOTION_PAYLOAD_ATTR} contains an invalid MotionDirectivePayload — the client:motion floor stays inert; native CSS still applies.`,
    });
    return null;
  }
}

/**
 * Feature-detect native scroll/view timeline CAPABILITY. A `true` here means the
 * browser understands `animation-timeline` — a NECESSARY but NOT sufficient condition
 * for the floor to stay idle: the element must ALSO carry the emitted native CSS (see
 * {@link nativeTimelineOwnsElement}). Defaulting to `false` (run the floor) when
 * `CSS.supports` is unavailable is conservative — the floor is the permanent guarantee.
 */
export function nativeTimelineSupported(): boolean {
  if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') return false;
  return CSS.supports('animation-timeline: scroll()') || CSS.supports('animation-timeline: view()');
}

/**
 * Whether native timeline CSS ACTUALLY drives THIS element — the only condition under
 * which the JS floor may stay idle. A global {@link nativeTimelineSupported} check is
 * NOT enough: a program surface (e.g. a `Reveal.chain`) that inlines
 * `data-liteship-motion-payload` but emits no `MotionCompiler` CSS would otherwise be
 * stranded at first paint on a capable browser — floor skipped, no CSS to scrub it.
 * `MotionCompiler` binds its single `liteship-motion-<target>-<from>-<to>` `@keyframes` (see its
 * `keyframeName`) to a scroll/view `animation-timeline` INSIDE a `supports(animation-timeline)`
 * block — but ONLY for a plan eligible to own a native timeline. A composed program whose
 * overlapping windows disagree on easing (`par` of differently-eased children, #148) is
 * `nativeTimeline: { eligible: false }`, so the compiler emits NO ownership block and no
 * `animation-name` binding — this scan then correctly returns false and the floor keeps
 * ownership (ADR-0041). `getComputedStyle().animationName` may still be a comma-separated list
 * (a single reveal can bind `liteship-motion-*` ALONGSIDE an author `translate`/`opacity`
 * animation), hence the `.split(',').some(...)` scan: ANY `liteship-motion-*` name in it means
 * native CSS is BOTH supported here AND emitted for this element. Absent it, the floor runs
 * (Law 1).
 */
function nativeTimelineOwnsElement(element: HTMLElement): boolean {
  if (!nativeTimelineSupported() || typeof getComputedStyle !== 'function') return false;
  const animationName = getComputedStyle(element).animationName;
  return animationName !== '' && animationName.split(',').some((name) => name.trim().startsWith('liteship-motion-'));
}

/** Whether the user asked for reduced motion (SSR-safe; false off-DOM / without matchMedia). */
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Idempotent driver: cancels the rAF / detaches the signal observer exactly once. */
interface MotionDriver {
  readonly stop: () => void;
}

/**
 * Start the continuous driver for a program: a SIGNAL clock (rAF-throttled scroll /
 * viewport observer, canonicalised progress) when the program carries signal inputs,
 * else a TIME clock (rAF wall-clock `elapsed / durationMs`). Each tick hands RAW
 * progress to `onTick`; the plan's easing is applied downstream in
 * {@link writeContinuousMap}. SSR-safe — with no rAF the loop never starts.
 */
function startDriver(program: MotionDirectivePayload, onTick: (progress: number) => void): MotionDriver {
  const signal = program.signals[0];

  if (signal !== undefined) {
    warnIfSignalUnserved(signal, { source: 'liteship/astro.motion', what: 'motion signal clock' });
    const emit = (): void => {
      const value = readSignalValue(signal);
      if (value === undefined) return;
      onTick(value);
    };
    emit(); // seed the first frame so the floor is correct before the first scroll
    const detach = typeof window === 'undefined' ? null : attachSignalObserver(signal, emit);
    let stopped = false;
    return {
      stop(): void {
        if (stopped) return;
        stopped = true;
        detach?.();
      },
    };
  }

  // TIME clock — rAF wall-clock over the plan's own duration. startRafLoop hands
  // elapsed-ms-since-first-frame and is SSR-guarded (no rAF ⇒ no loop); the driver
  // self-terminates once `t` reaches 1 (a finite one-shot, not a perpetual loop).
  const durationMs = Math.max(1, program.runtime.durationMs);
  let stopLoop: (() => void) | null = null;
  stopLoop = startRafLoop((elapsedMs) => {
    const t = Math.min(1, elapsedMs / durationMs);
    onTick(t);
    if (t >= 1) stopLoop?.();
  });
  return {
    stop(): void {
      stopLoop?.();
      stopLoop = null;
    },
  };
}

/**
 * Activate the `client:motion` directive on `element`. Reads the inlined lowered
 * payload off {@link MOTION_PAYLOAD_ATTR}, constructs a private
 * {@link StateCellStore} (one discrete pose cell + one continuous progress cell —
 * the FIRST production caller of `writeContinuous`), and runs the JS floor when
 * native timelines are unavailable. Honors `liteship:reinit` (dispose-then-re-read)
 * and `liteship:teardown` (stop + free the store).
 */
export function initMotionDirective(load: () => Promise<unknown>, element: HTMLElement): void {
  let driver: MotionDriver | null = null;
  let store: StateCellStore | null = null;

  const applyDiscrete = (stateName: string): void => {
    if (!store) return;
    store.applyDiscrete(DISCRETE_CELL, stateName);
    if (element.getAttribute('data-liteship-state') !== stateName) {
      element.setAttribute('data-liteship-state', stateName);
    }
    dispatchLiteshipEvent(element, GRAPH_STATE_EVENT, { discrete: { [stateName]: stateName }, state: stateName });
  };

  const teardownDriver = (): void => {
    driver?.stop();
    driver = null;
    if (store) {
      // The store is directive-private (no shared registry): unregister the cells
      // and drop the reference so a reinit re-registers into a fresh store and the
      // old one is freed — never double-held.
      store.unregister(DISCRETE_CELL);
      store.unregister(CONTINUOUS_CELL);
      store = null;
    }
  };

  const setup = (): void => {
    // Dispose FIRST so a reinit re-reads fresh attributes without double-holding.
    teardownDriver();

    const raw = element.getAttribute(MOTION_PAYLOAD_ATTR);
    if (raw === null) {
      Diagnostics.warnOnceRegistered({
        source: 'liteship/astro.motion',
        code: 'astro/motion/motion-program-missing',
        message: `A client:motion host carries no ${MOTION_PAYLOAD_ATTR} — nothing to drive; the directive no-ops. Inline serializeMotionDirectivePayload(payload) on the element.`,
      });
      return;
    }
    const program = parseMotionDirectivePayload(raw);
    if (!program) return;

    const { runtime } = program;
    const reduced = prefersReducedMotion();

    // Private store: the discrete pose cell + the continuous progress cell.
    const s = StateCellStore.create();
    s.register(DISCRETE_CELL, [runtime.fromState, runtime.toState], { authority: 'synthetic' });
    s.register(CONTINUOUS_CELL, ['live'], { kind: 'continuous', authority: 'synthetic' });
    store = s;

    const initialState = resolveRevealInitialState(program.intent, { prefersReducedMotion: reduced });
    applyDiscrete(initialState);

    // Reduced-motion + settle: no tween. Pin the t=1 endpoint ONCE, settle the
    // discrete cell to the final state, and SKIP the loop (final semantic state).
    if (reduced && program.intent.policy.reducedMotion === 'settle') {
      writeContinuousMap(element, runtime, 1);
      s.writeContinuous(CONTINUOUS_CELL, 1);
      applyDiscrete(runtime.toState);
      return;
    }

    // Native scroll/view timeline CSS actually drives THIS element ⇒ CSS owns the
    // CONTINUOUS scrub, so the per-frame leaf writes stay idle. But CSS keyframes cannot
    // flip the discrete `data-liteship-state` or dispatch `liteship:graph-state`, so the DISCRETE
    // threshold crossing runs REGARDLESS — a lightweight observer — or the semantic state
    // would stall at the initial pose while the visual scrubs past (F-MOT). A capability
    // check alone is not enough here: a program surface with no emitted MotionCompiler CSS
    // gets the full floor (nativeTimelineOwnsElement is false → continuous runs too).
    const nativeOwnsContinuous = nativeTimelineOwnsElement(element);

    const threshold = program.threshold ?? DEFAULT_THRESHOLD;
    let lastDiscrete: string = initialState;
    driver = startDriver(program, (progress) => {
      const p = clamp01(progress);
      if (!nativeOwnsContinuous) {
        // CONTINUOUS: eased leaf write every frame + continuous cell write. Never a patch.
        // Skipped when native `animation-timeline` CSS owns the scrub (it writes these).
        writeContinuousMap(element, runtime, p);
        s.writeContinuous(CONTINUOUS_CELL, p);
      }
      // DISCRETE: a crossing of the raw threshold flips state (sparse). Always runs — the
      // semantic state machine is JS-owned even when native CSS animates the visual.
      const next = p >= threshold ? runtime.toState : runtime.fromState;
      if (next !== lastDiscrete) {
        lastDiscrete = next;
        applyDiscrete(next);
      }
    });
  };

  element.addEventListener('liteship:reinit', setup);
  element.addEventListener('liteship:teardown', teardownDriver);

  setup();
  load();
}

/** Astro client directive entry that marks the host before starting the motion runtime. */
export const motionDirective = (load: () => Promise<unknown>, opts: Record<string, unknown>, el: HTMLElement): void => {
  bootDirectiveEntry('motion', load, opts, el, (runtimeLoad, _runtimeOpts, runtimeEl) => {
    initMotionDirective(runtimeLoad, runtimeEl);
  });
};
