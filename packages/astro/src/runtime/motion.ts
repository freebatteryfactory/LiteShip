/**
 * Entry point for the `client:motion` directive — the PRODUCTION driver of the
 * continuous motion floor (#126, F-MOT-2/3).
 *
 * The native-CSS path (`MotionCompiler`) owns motion wherever `animation-timeline`
 * is supported. This directive is the permanent FLOOR for everywhere it is not: it
 * reads an SSR-inlined, already-lowered motion program off `data-czap-motion-program`
 * and, when native is unavailable, scrubs the same signal→progress the CSS would,
 * writing typed leaf values through {@link writeContinuousMap} every frame. That
 * writer samples the program's OWN easing descriptor (`RuntimeWritePlan.easing`) —
 * the same `Easing.spring` the CSS `linear()` compiles from — so the JS floor and
 * native CSS read ONE identical kernel (Law 4).
 *
 * The split the runtime enforces (Law 15/16):
 *   - CONTINUOUS — the eased tween. A LEAF write every frame (`--czap-*` custom
 *     properties + a `czap:uniform-update`) and a continuous StateCell write. NEVER
 *     a graph patch (patching per frame would re-seal the graph 60×/s).
 *   - DISCRETE — the state CROSSING at the threshold. `data-czap-state` flips and a
 *     `czap:graph-state` fires through the exact seam `scene-bridge.applyDiscreteState`
 *     uses. Sparse — only on a real crossing.
 *
 * Lifecycle mirrors the other host drivers: reduced-motion + `settle` policy skips
 * the loop and pins the final endpoint once; `czap:reinit` disposes BEFORE
 * re-reading (never double-holds); `czap:teardown` stops the driver and frees the
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
  type StateCellStoreShape,
} from '@czap/core';
import { dispatchCzapEvent } from '@czap/web';
import { writeContinuousMap } from './write-continuous-map.js';
import { attachSignalObserver, readSignalValue, warnIfSignalUnserved } from './boundary.js';
import { bootDirectiveEntry } from './directive-bound.js';

/**
 * The opt-in attribute carrying the SSR-inlined lowered motion program (JSON).
 * Presence GATES the directive — like `client:graph`'s `data-czap-graph`, it is
 * read directly off the host, not through a wire registry.
 */
export const MOTION_PROGRAM_ATTR = 'data-czap-motion-program';

/** The default discrete crossing point on RAW (un-eased) progress. */
const DEFAULT_THRESHOLD = 0.5;

/** The store cell names the directive registers on its private {@link StateCellStore}. */
const DISCRETE_CELL = 'motion';
const CONTINUOUS_CELL = 'motion.progress';

/** The canonical discrete-crossing event, shared with the scene bridge. */
const GRAPH_STATE_EVENT = 'czap:graph-state';

/**
 * The SSR-inlined, already-lowered motion program the directive drives. The
 * authority (see `examples/showcase/src/server/motion-program.ts`) lowers a
 * {@link RevealIntent} to a graph, interprets it, and serializes THIS: the reveal
 * intent (drives reduced-motion first paint) + the runtime leaf-write plan (the
 * floor, carrying its easing) + the resolved signal inputs.
 */
export interface SerializedMotionProgram {
  /** The authoring intent — drives {@link resolveRevealInitialState} for first paint. */
  readonly intent: RevealIntent;
  /** The lowered leaf-write floor, including its self-describing easing descriptor. */
  readonly runtime: RuntimeWritePlan;
  /** Resolved continuous signal inputs (e.g. `['scroll.progress']`); empty ⇒ time trigger. */
  readonly signals: readonly string[];
  /** Discrete crossing point on raw progress (default `0.5`). */
  readonly threshold?: number;
}

/**
 * The widened authoring/easing vocabulary a serialized `RuntimeEasing`
 * descriptor may carry. Beyond the legacy `linear|ease|spring` the full Easing
 * catalog (bounce/elastic/back/cubicBezier) is now authorable; each catalog easing
 * is serialized as a sampled `points` arm the JS floor lerps — the IDENTICAL point
 * list the CSS `linear()` uses, so both floors read one curve (Law 4).
 */
const RUNTIME_EASING_KINDS: ReadonlySet<string> = new Set([
  'linear',
  'ease',
  'spring',
  'points',
  'bounce',
  'elastic',
  'back',
  'cubicBezier',
]);

/**
 * Structural guard for a serialized `RuntimeEasing` descriptor. Accepts the
 * widened kind vocabulary and an OPTIONAL serialized sampled-points arm (a
 * non-degenerate array of finite numbers), rejecting anything else — an absent /
 * unknown `kind` or a malformed `points` list fails LOUDLY upstream in
 * {@link parseMotionProgram}, leaving the native/CSS floor untouched (Law 1).
 */
function isRuntimeEasingDescriptor(value: unknown): boolean {
  if (value === null || typeof value !== 'object') return false;
  const easing = value as Record<string, unknown>;
  if (typeof easing.kind !== 'string' || !RUNTIME_EASING_KINDS.has(easing.kind)) return false;
  if (easing.points !== undefined) {
    if (!Array.isArray(easing.points) || easing.points.length < 2) return false;
    for (const point of easing.points) {
      if (typeof point !== 'number' || !Number.isFinite(point)) return false;
    }
  }
  if (easing.spring !== undefined && (easing.spring === null || typeof easing.spring !== 'object')) return false;
  return true;
}

function isRuntimeWritePlan(value: unknown): value is RuntimeWritePlan {
  if (value === null || typeof value !== 'object') return false;
  const plan = value as Record<string, unknown>;
  return (
    Array.isArray(plan.properties) &&
    typeof plan.fromState === 'string' &&
    typeof plan.toState === 'string' &&
    typeof plan.durationMs === 'number' &&
    isRuntimeEasingDescriptor(plan.easing)
  );
}

/**
 * Parse the inlined program, returning `null` LOUDLY on any malformed payload so
 * the directive stays inert and the native/CSS floor is unaffected (Law 1).
 */
export function parseMotionProgram(raw: string): SerializedMotionProgram | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (cause) {
    Diagnostics.warnOnce({
      source: 'czap/astro.motion',
      code: 'motion-program-malformed',
      message: `${MOTION_PROGRAM_ATTR} was not valid JSON — the client:motion floor stays inert; native CSS still applies. Serialize with JSON.stringify(a lowered motion program).`,
      cause,
    });
    return null;
  }

  const program = parsed as Partial<SerializedMotionProgram>;
  if (
    program === null ||
    typeof program !== 'object' ||
    !isRuntimeWritePlan(program.runtime) ||
    program.intent === null ||
    typeof program.intent !== 'object' ||
    !Array.isArray(program.signals)
  ) {
    Diagnostics.warnOnce({
      source: 'czap/astro.motion',
      code: 'motion-program-shape-invalid',
      message: `${MOTION_PROGRAM_ATTR} is missing required fields ({ intent, runtime, signals }) — the client:motion floor stays inert; native CSS still applies.`,
    });
    return null;
  }
  return program as SerializedMotionProgram;
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
 * `data-czap-motion-program` but emits no `MotionCompiler` CSS would otherwise be
 * stranded at first paint on a capable browser — floor skipped, no CSS to scrub it.
 * `MotionCompiler` binds its `czap-motion-*` keyframes (see its `keyframeName`) to a
 * scroll/view `animation-timeline` INSIDE a `supports(animation-timeline)` block. With
 * per-track native emission a boundary composes one `czap-motion-*-<prop>` `@keyframes`
 * per property into an `animation` shorthand LIST, so `getComputedStyle().animationName`
 * is a comma-separated list — hence the `.split(',').some(...)` scan: ANY `czap-motion-*`
 * name in it means native CSS is BOTH supported here AND emitted for this element. Absent
 * it, the floor runs (Law 1).
 */
function nativeTimelineOwnsElement(element: HTMLElement): boolean {
  if (!nativeTimelineSupported() || typeof getComputedStyle !== 'function') return false;
  const animationName = getComputedStyle(element).animationName;
  return animationName !== '' && animationName.split(',').some((name) => name.trim().startsWith('czap-motion-'));
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
function startDriver(program: SerializedMotionProgram, onTick: (progress: number) => void): MotionDriver {
  const signal = program.signals[0];

  if (signal !== undefined) {
    warnIfSignalUnserved(signal, { source: 'czap/astro.motion', what: 'motion signal clock' });
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
 * program off {@link MOTION_PROGRAM_ATTR}, constructs a private
 * {@link StateCellStore} (one discrete pose cell + one continuous progress cell —
 * the FIRST production caller of `writeContinuous`), and runs the JS floor when
 * native timelines are unavailable. Honors `czap:reinit` (dispose-then-re-read)
 * and `czap:teardown` (stop + free the store).
 */
export function initMotionDirective(load: () => Promise<unknown>, element: HTMLElement): void {
  let driver: MotionDriver | null = null;
  let store: StateCellStoreShape | null = null;

  const applyDiscrete = (stateName: string): void => {
    if (!store) return;
    store.applyDiscrete(DISCRETE_CELL, stateName);
    if (element.getAttribute('data-czap-state') !== stateName) {
      element.setAttribute('data-czap-state', stateName);
    }
    dispatchCzapEvent(element, GRAPH_STATE_EVENT, { discrete: { [stateName]: stateName }, state: stateName });
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

    const raw = element.getAttribute(MOTION_PROGRAM_ATTR);
    if (raw === null) {
      Diagnostics.warnOnce({
        source: 'czap/astro.motion',
        code: 'motion-program-missing',
        message: `A client:motion host carries no ${MOTION_PROGRAM_ATTR} — nothing to drive; the directive no-ops. Inline the lowered program (JSON.stringify) on the element.`,
      });
      return;
    }
    const program = parseMotionProgram(raw);
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
    // flip the discrete `data-czap-state` or dispatch `czap:graph-state`, so the DISCRETE
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

  element.addEventListener('czap:reinit', setup);
  element.addEventListener('czap:teardown', teardownDriver);

  setup();
  load();
}

/** Astro client directive entry that marks the host before starting the motion runtime. */
export const motionDirective = (load: () => Promise<unknown>, opts: Record<string, unknown>, el: HTMLElement): void => {
  bootDirectiveEntry('motion', load, opts, el, (runtimeLoad, _runtimeOpts, runtimeEl) => {
    initMotionDirective(runtimeLoad, runtimeEl);
  });
};
