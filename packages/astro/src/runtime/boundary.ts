/**
 * Client-runtime helpers for parsing serialized boundaries out of
 * `data-czap-boundary` attributes, attaching signal observers
 * (viewport, scroll), evaluating boundaries live, and applying the
 * resulting state to a satellite element.
 *
 * Consumed by the Astro `client:satellite` / `client:worker` directives
 * when they hydrate a server-rendered `<div data-czap-boundary="...">`.
 *
 * @module
 */
import { Boundary, BoundaryAttribute, Diagnostics } from '@czap/core';

/**
 * JSON shape produced on the server by `satelliteAttrs()` and read back
 * on the client via {@link parseBoundary}. Every field corresponds
 * directly to a {@link Boundary.Shape} input.
 */
export interface SerializedBoundary {
  /** Optional stable boundary id (becomes the runtime `name`). */
  readonly id?: string;
  /** Signal key this boundary consumes (e.g. `"viewport.width"`). */
  readonly input: string;
  /** Ordered ascending thresholds (`thresholds[i]` lower bound of `states[i]`). */
  readonly thresholds: readonly number[];
  /** Non-empty ordered state labels. */
  readonly states: readonly [string, ...string[]];
  /** Optional hysteresis band applied during evaluation. */
  readonly hysteresis?: number;
  /** Optional activation filter (JSON-serializable subset of {@link Boundary.Spec}). */
  readonly spec?: {
    readonly timeRange?: { readonly from?: number; readonly until?: number };
    readonly experimentId?: string;
  };
}

/**
 * Client-side representation of a parsed boundary plus its resolved
 * runtime name, ready to be evaluated against a live signal.
 */
export interface RuntimeBoundary {
  /** Resolved boundary name (defaults to `"default"`). */
  readonly name: string;
  /** Signal key this boundary consumes. */
  readonly input: string;
  /** Fully-constructed `Boundary.Shape` ready for evaluation. */
  readonly boundary: Boundary.Shape<string, readonly [string, ...string[]]>;
}

/**
 * Normalised boundary-state payload used for `CustomEvent` dispatch and
 * DOM application. CSS keys are filtered to `--czap-*`; ARIA keys to
 * `role` / `aria-*`.
 */
export interface BoundaryStateDetail {
  /** Discrete state per quantizer name. */
  readonly discrete: Record<string, string>;
  /** Whitelisted `--czap-*` CSS variable map. */
  readonly css: Record<string, string | number>;
  /** GLSL uniform map (`u_*`). */
  readonly glsl: Record<string, number>;
  /** Whitelisted ARIA attribute map. */
  readonly aria: Record<string, string>;
}

function isAllowedBoundaryCssProperty(property: string): boolean {
  return property.startsWith('--czap-');
}

function parseBoundaryPayload(boundaryJson: string): Partial<SerializedBoundary> | null {
  let parsed: Partial<SerializedBoundary> | null = null;
  let malformed = false;

  try {
    parsed = JSON.parse(boundaryJson) as Partial<SerializedBoundary>;
  } catch (error) {
    if (error instanceof SyntaxError) {
      malformed = true;
    } else {
      throw error;
    }
  }

  return malformed ? null : parsed;
}

/**
 * Parse a JSON-serialised boundary (as produced by
 * `satelliteAttrs()`) into a {@link RuntimeBoundary}. Returns `null`
 * for malformed or structurally invalid payloads so callers can fall
 * back cleanly rather than throwing mid-hydration.
 */
export function parseBoundary(boundaryJson: string | null): RuntimeBoundary | null {
  if (!boundaryJson) {
    return null;
  }

  const parsed = parseBoundaryPayload(boundaryJson);
  if (!parsed) {
    Diagnostics.warnOnce({
      source: 'czap/astro.boundary',
      code: 'boundary-json-invalid',
      message:
        `data-czap-boundary on this element is not valid JSON — the satellite runtime will stay inert. ` +
        `Fix: spread satelliteAttrs({ boundary }) from @czap/astro or re-serialize with JSON.stringify.`,
      detail: { snippet: boundaryJson.slice(0, 120) },
    });
    return null;
  }

  if (
    typeof parsed.input !== 'string' ||
    !Array.isArray(parsed.thresholds) ||
    parsed.thresholds.length === 0 ||
    !Array.isArray(parsed.states) ||
    parsed.states.length === 0 ||
    !parsed.thresholds.every((value) => typeof value === 'number') ||
    !parsed.states.every((value) => typeof value === 'string')
  ) {
    Diagnostics.warnOnce({
      source: 'czap/astro.boundary',
      code: 'boundary-json-shape-invalid',
      message:
        `data-czap-boundary JSON is missing required fields (input, thresholds, states) — ` +
        `the satellite runtime will stay inert. Fix: export a Boundary.make({ input, at }) value via satelliteAttrs().`,
      detail: { snippet: boundaryJson.slice(0, 120) },
    });
    return null;
  }

  const states = parsed.states as readonly [string, ...string[]];
  const first = [parsed.thresholds[0]!, states[0]] as const;
  const rest = parsed.thresholds.slice(1).map((threshold, index) => [threshold, states[index + 1]!] as const);
  const at = [first, ...rest] as const;

  return {
    name: parsed.id ?? 'default',
    input: parsed.input,
    boundary: Boundary.make({
      input: parsed.input,
      at,
      ...(typeof parsed.hysteresis === 'number' ? { hysteresis: parsed.hysteresis } : {}),
      ...(parsed.spec ? { spec: parsed.spec } : {}),
    }),
  };
}

/** Build activation context for {@link Boundary.isActive} from the live document. */
export function buildBoundaryActivationContext(): {
  capabilities: Record<string, unknown>;
  nowMs: number;
  activeExperiments: readonly string[];
} {
  const experimentsAttr =
    typeof document !== 'undefined' ? document.documentElement.getAttribute('data-czap-experiments') : null;
  const activeExperiments = experimentsAttr
    ? experimentsAttr
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  return {
    capabilities: {
      webgpu: typeof navigator !== 'undefined' && 'gpu' in navigator,
      webgl2: typeof document !== 'undefined' && !!document.createElement('canvas').getContext('webgl2'),
    },
    nowMs: Date.now(),
    activeExperiments,
  };
}

function attachResizeObserver(callback: () => void): (() => void) | null {
  if (typeof ResizeObserver === 'undefined') {
    return null;
  }

  const observer = new ResizeObserver(callback);
  observer.observe(document.documentElement);
  return () => observer.disconnect();
}

function attachScrollListener(input: string, callback: () => void): (() => void) | null {
  if (typeof window === 'undefined') {
    return null;
  }

  // rAF-throttle: scroll fires per frame (or faster); one pending frame
  // coalesces bursts so boundary evaluation runs at most once per frame.
  let frame: number | null = null;
  const handler = (): void => {
    if (frame !== null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      callback();
    });
  };

  window.addEventListener('scroll', handler, { passive: true });
  // scroll.progress depends on scrollHeight - innerHeight, so resizes
  // move the value even when scrollY is unchanged.
  const observeResize = input === 'scroll.progress';
  if (observeResize) {
    window.addEventListener('resize', handler, { passive: true });
  }

  return () => {
    window.removeEventListener('scroll', handler);
    if (observeResize) {
      window.removeEventListener('resize', handler);
    }
    if (frame !== null) {
      cancelAnimationFrame(frame);
      frame = null;
    }
  };
}

/**
 * Attach the observer matching a signal `input` and call `callback`
 * whenever the underlying signal may have changed:
 *
 * - `viewport.*` — ResizeObserver on `document.documentElement`
 * - `scroll.*`   — passive scroll listener, rAF-throttled
 *   (`scroll.progress` also observes resize: its denominator is
 *   viewport-dependent)
 *
 * Returns a cleanup function, or `null` when no observer was attached
 * (unknown signal family or missing platform support). Callers treat
 * `null` as "this boundary will never re-evaluate" — the same frozen
 * semantics {@link readSignalValue} has for unknown inputs.
 */
export function attachSignalObserver(input: string, callback: () => void): (() => void) | null {
  if (input.startsWith('viewport.')) {
    return attachResizeObserver(callback);
  }

  if (input.startsWith('scroll.')) {
    return attachScrollListener(input, callback);
  }

  return null;
}

/**
 * Read the current numeric value for a signal `input`. Supported:
 * `viewport.width` / `viewport.height`, `scroll.x` / `scroll.y`, and the
 * derived `scroll.progress` (document scroll position as 0–100).
 * Returns `undefined` for unknown inputs (`audio.*` and `network.*`
 * have no built-in reader — feed those through `@czap/quantizer`'s
 * `live.evaluate()` instead); returns `0` in non-DOM environments so
 * callers can treat SSR and malformed signals uniformly.
 */
export function readSignalValue(input: string): number | undefined {
  if (typeof window === 'undefined') return 0;

  if (input.startsWith('viewport.')) {
    const axis = input.slice('viewport.'.length);
    return axis === 'height' ? window.innerHeight : window.innerWidth;
  }

  if (input.startsWith('scroll.')) {
    const axis = input.slice('scroll.'.length);
    if (axis === 'x') return window.scrollX;
    if (axis === 'y') return window.scrollY;
    if (axis === 'progress') {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max <= 0) return 0;
      return Math.min(100, Math.max(0, (window.scrollY / max) * 100));
    }
    return undefined;
  }

  return undefined;
}

/**
 * Evaluate a {@link RuntimeBoundary} against a signal value, applying
 * hysteresis when `previousState` is provided and the boundary has a
 * hysteresis band.
 */
export function evaluateBoundary(boundary: RuntimeBoundary, value: number, previousState?: string): string {
  // Activation gating only matters when the boundary carries a spec
  // (time-range / experiment / device filter). For the common spec-less
  // case `isActive` is unconditionally true, so building the activation
  // context here — which allocates and, in a browser, creates a canvas +
  // WebGL2 context on every call — is pure hot-path waste. Skip it.
  if (boundary.boundary.spec) {
    const context = buildBoundaryActivationContext();
    if (!Boundary.isActive(boundary.boundary, context)) {
      return previousState ?? boundary.boundary.states[0]!;
    }
  }

  if (previousState && boundary.boundary.hysteresis) {
    return Boundary.evaluateWithHysteresis(boundary.boundary, value, previousState);
  }

  return Boundary.evaluate(boundary.boundary, value);
}

/**
 * Merge `state.*` and `state.outputs.*` fields into a single
 * {@link BoundaryStateDetail}, filtering CSS keys to `--czap-*` and
 * ARIA keys to `role` / `aria-*`. Used as the `detail` of the
 * `czap:state` custom event.
 */
export function normalizeBoundaryState(state: {
  readonly discrete?: Record<string, string>;
  readonly css?: Record<string, string | number>;
  readonly glsl?: Record<string, number>;
  readonly aria?: Record<string, string>;
  readonly outputs?: {
    readonly css?: Record<string, string | number>;
    readonly glsl?: Record<string, number>;
    readonly aria?: Record<string, string>;
  };
}): BoundaryStateDetail {
  const css = { ...(state.outputs?.css ?? {}), ...(state.css ?? {}) };
  const aria = { ...(state.outputs?.aria ?? {}), ...(state.aria ?? {}) };

  return {
    discrete: { ...(state.discrete ?? {}) },
    css: Object.fromEntries(Object.entries(css).filter(([property]) => isAllowedBoundaryCssProperty(property))),
    glsl: { ...(state.outputs?.glsl ?? {}), ...(state.glsl ?? {}) },
    aria: Object.fromEntries(Object.entries(aria).filter(([attribute]) => BoundaryAttribute.isAllowedKey(attribute))),
  };
}

/**
 * Apply a normalised state to a satellite element: sets
 * `data-czap-state`, writes whitelisted CSS variables and ARIA
 * attributes, and dispatches `eventName` + `czap:uniform-update`
 * custom events for downstream listeners (GPU/WASM runtimes).
 */
export function applyBoundaryState(
  element: HTMLElement,
  boundary: RuntimeBoundary,
  state: {
    readonly discrete?: Record<string, string>;
    readonly css?: Record<string, string | number>;
    readonly glsl?: Record<string, number>;
    readonly aria?: Record<string, string>;
    readonly outputs?: {
      readonly css?: Record<string, string | number>;
      readonly glsl?: Record<string, number>;
      readonly aria?: Record<string, string>;
    };
  },
  eventName: string,
): void {
  const detail = normalizeBoundaryState(state);
  const stateName = detail.discrete[boundary.name];

  if (stateName && element.getAttribute('data-czap-state') !== stateName) {
    element.setAttribute('data-czap-state', stateName);
  }

  for (const [property, value] of Object.entries(detail.css)) {
    element.style.setProperty(property, String(value));
  }

  for (const [attribute, value] of Object.entries(detail.aria)) {
    element.setAttribute(attribute, value);
  }

  element.dispatchEvent(
    new CustomEvent(eventName, {
      detail,
      bubbles: true,
    }),
  );

  element.dispatchEvent(
    new CustomEvent('czap:uniform-update', {
      detail,
      bubbles: true,
    }),
  );
}
