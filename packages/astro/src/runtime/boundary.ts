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
import { Boundary, BoundaryAttribute, Diagnostics, inputToSource } from '@czap/core';
import { readAudioSignal, attachAudioObserver } from './audio-signal.js';

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
  /**
   * Optional authored per-state ARIA/data attributes (`@aria` blocks), keyed by
   * state then attribute. Joined onto the satellite from the build manifest by
   * content address. Absent for boundaries with no `@aria` — the common case,
   * so the field is optional and needs no `_version` bump for old payloads.
   */
  readonly stateAttributes?: Readonly<Record<string, Readonly<Record<string, string>>>>;
  /**
   * Optional authored per-state GLSL uniform values (`@glsl` blocks), keyed by
   * state then `u_*` uniform name. Joined onto the satellite from the build
   * manifest by content address — the GLSL analog of {@link stateAttributes}.
   * Absent for boundaries with no `@glsl`; optional so old payloads parse.
   */
  readonly glslStateUniforms?: Readonly<Record<string, Readonly<Record<string, number>>>>;
  /**
   * Optional authored per-state WGSL uniform binding values (`@wgsl` blocks),
   * keyed by state then bare snake_case field name. Joined onto the satellite
   * from the build manifest by content address. Absent for boundaries with no
   * `@wgsl` — optional, so old payloads need no `_version` bump.
   */
  readonly stateWgsl?: Readonly<Record<string, Readonly<Record<string, number>>>>;
  /**
   * Optional emitted GLSL preamble (`GLSLCompileResult.declarations`: state
   * `#define`s + `uniform <type> u_*;` lines). Joined onto the satellite from the
   * build manifest's `outputs[].glsl.declarations` — the compiler's OWN uniform
   * vocabulary, which the `client:gpu` GLSL runtime prepends to the fragment
   * source before compile. The uniform names the runtime binds and the names the
   * compiler emits are then two views of one source, never a hand-typed mirror.
   */
  readonly glslDeclarations?: string;
  /**
   * Optional emitted WGSL preamble (`WGSLCompileResult.declarations`: state
   * consts + the uniform struct + `@group(0) @binding(0)`). The WGSL analog of
   * {@link glslDeclarations}, prepended to the shader module before
   * `createShaderModule`.
   */
  readonly wgslDeclarations?: string;
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
  /**
   * Authored per-state ARIA attributes resolved at parse time. `applyBoundaryState`
   * composes `stateAttributes[currentState]` over the reflected aria so authored
   * `aria-*`/`role` update live on every state crossing (not SSR-frozen).
   */
  readonly stateAttributes?: Readonly<Record<string, Readonly<Record<string, string>>>>;
  /**
   * Authored per-state GLSL uniforms resolved at parse time. `applyBoundaryState`
   * resolves `glslStateUniforms[currentState]` into `detail.glsl` so the GPU
   * runtime updates authored uniforms live on every crossing (not SSR-frozen) —
   * the GLSL analog of {@link stateAttributes}.
   */
  readonly glslStateUniforms?: Readonly<Record<string, Readonly<Record<string, number>>>>;
  /**
   * Authored per-state WGSL uniform binding values resolved at parse time.
   * `applyBoundaryState` resolves `stateWgsl[currentState]` into `detail.wgsl`
   * so the WGSL `client:gpu` runtime rebinds the live uniform buffer on every
   * state crossing (not SSR-frozen).
   */
  readonly stateWgsl?: Readonly<Record<string, Readonly<Record<string, number>>>>;
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
  /** WGSL uniform-struct field map (bare snake_case, e.g. `blur_radius`). */
  readonly wgsl: Record<string, number>;
  /** Whitelisted ARIA attribute map. */
  readonly aria: Record<string, string>;
}

function isAllowedBoundaryCssProperty(property: string): boolean {
  return property.startsWith('--czap-');
}

/** User-facing parse failure text shared by the runtime and dev inspector. */
export function boundaryParseFailureMessage(boundaryJson: string | null): string | null {
  if (!boundaryJson) {
    return null;
  }

  const parsed = parseBoundaryPayload(boundaryJson);
  if (!parsed) {
    return (
      `data-czap-boundary on this element is not valid JSON — the satellite runtime will stay inert. ` +
      `Fix: spread satelliteAttrs({ boundary }) from @czap/astro or re-serialize with JSON.stringify.`
    );
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
    return (
      `data-czap-boundary JSON is missing required fields (input, thresholds, states) — ` +
      `the satellite runtime will stay inert. Fix: export a Boundary.make({ input, at }) value via satelliteAttrs().`
    );
  }

  return null;
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

  const failureMessage = boundaryParseFailureMessage(boundaryJson);
  if (failureMessage) {
    const code = failureMessage.includes('not valid JSON') ? 'boundary-json-invalid' : 'boundary-json-shape-invalid';
    Diagnostics.warnOnce({
      source: 'czap/astro.boundary',
      code,
      message: failureMessage,
      detail: { snippet: boundaryJson.slice(0, 120) },
    });
    return null;
  }

  const parsed = parseBoundaryPayload(boundaryJson)! as SerializedBoundary;

  const states = parsed.states as readonly [string, ...string[]];
  const thresholds = parsed.thresholds;
  const first = [thresholds[0]!, states[0]] as const;
  const rest = thresholds.slice(1).map((threshold, index) => [threshold, states[index + 1]!] as const);
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
    ...(parsed.stateAttributes && typeof parsed.stateAttributes === 'object'
      ? { stateAttributes: parsed.stateAttributes }
      : {}),
    ...(parsed.glslStateUniforms && typeof parsed.glslStateUniforms === 'object'
      ? { glslStateUniforms: parsed.glslStateUniforms }
      : {}),
    ...(parsed.stateWgsl && typeof parsed.stateWgsl === 'object' ? { stateWgsl: parsed.stateWgsl } : {}),
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

function attachScrollListener(axis: 'x' | 'y' | 'progress', callback: () => void): (() => void) | null {
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
  const observeResize = axis === 'progress';
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
 * - `audio.*`    — rAF observer over the host-published analyser value
 *
 * The signal family is derived from the SOURCE OF TRUTH ({@link inputToSource}
 * in `@czap/core`), never re-parsed here — every reader on the hot path shares
 * the one parse so the vocabulary cannot drift.
 *
 * Returns a cleanup function, or `null` when no observer was attached
 * (unknown signal family or missing platform support). Callers treat
 * `null` as "this boundary will never re-evaluate" — the same frozen
 * semantics {@link readSignalValue} has for unknown inputs.
 */
export function attachSignalObserver(input: string, callback: () => void): (() => void) | null {
  const source = inputToSource(input);
  if (!source) return null;

  switch (source.type) {
    case 'viewport':
      return attachResizeObserver(callback);
    case 'scroll':
      return attachScrollListener(source.axis ?? 'y', callback);
    case 'audio':
      // Only amplitude/beat have a live producer; sample/normalized are offline
      // modes that defer to the quantizer (no observer — frozen).
      return source.mode === 'amplitude' || source.mode === 'beat' ? attachAudioObserver(callback) : null;
    default:
      return null;
  }
}

/**
 * Read the current numeric value for a signal `input`. Supported:
 * `viewport.width` / `viewport.height`, `scroll.x` / `scroll.y`, the derived
 * `scroll.progress` (document scroll position as **0..1**, see below), and
 * `audio.amplitude` / `audio.beat` (read from the host analyser producer).
 *
 * The axis is derived from the SOURCE OF TRUTH ({@link inputToSource}), never
 * re-parsed here. Returns `undefined` for inputs outside the vocabulary
 * (feed those through `@czap/quantizer`'s `live.evaluate()` instead); returns
 * `0` in non-DOM environments so callers can treat SSR and malformed signals
 * uniformly.
 *
 * CANONICAL `scroll.progress` SCALE: **0..1**. This matches `Signal` (the
 * `SignalSource` source of truth, `core/src/signal.ts` — `window.scrollY/max`),
 * which is the scale boundaries are authored against. The prior runtime
 * returned 0..100, so a boundary authored at `0.5` evaluated wrong; the scale
 * here and the inspector track max (`inspector.ts`) are pinned to agree by a
 * drift guard.
 */
export function readSignalValue(input: string): number | undefined {
  if (typeof window === 'undefined') return 0;

  const source = inputToSource(input);
  if (!source) return undefined;

  switch (source.type) {
    case 'viewport':
      return source.axis === 'height' ? window.innerHeight : window.innerWidth;
    case 'scroll': {
      if (source.axis === 'x') return window.scrollX;
      if (source.axis === 'y') return window.scrollY;
      // scroll.progress — 0..1, identical formula to Signal's source of truth.
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max <= 0) return 0;
      return Math.min(1, Math.max(0, window.scrollY / max));
    }
    case 'audio':
      // Only amplitude/beat are live; sample/normalized defer to the quantizer
      // (undefined → frozen), per the hand-off noted above.
      return source.mode === 'amplitude' || source.mode === 'beat' ? readAudioSignal(source.mode) : undefined;
    default:
      return undefined;
  }
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
  readonly wgsl?: Record<string, number>;
  readonly aria?: Record<string, string>;
  readonly outputs?: {
    readonly css?: Record<string, string | number>;
    readonly glsl?: Record<string, number>;
    readonly wgsl?: Record<string, number>;
    readonly aria?: Record<string, string>;
  };
}): BoundaryStateDetail {
  const css = { ...(state.outputs?.css ?? {}), ...(state.css ?? {}) };
  const aria = { ...(state.outputs?.aria ?? {}), ...(state.aria ?? {}) };

  return {
    discrete: { ...(state.discrete ?? {}) },
    css: Object.fromEntries(Object.entries(css).filter(([property]) => isAllowedBoundaryCssProperty(property))),
    glsl: { ...(state.outputs?.glsl ?? {}), ...(state.glsl ?? {}) },
    wgsl: { ...(state.outputs?.wgsl ?? {}), ...(state.wgsl ?? {}) },
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
    readonly wgsl?: Record<string, number>;
    readonly aria?: Record<string, string>;
    readonly outputs?: {
      readonly css?: Record<string, string | number>;
      readonly glsl?: Record<string, number>;
      readonly wgsl?: Record<string, number>;
      readonly aria?: Record<string, string>;
    };
  },
  eventName: string,
): void {
  const normalized = normalizeBoundaryState(state);
  const stateName = normalized.discrete[boundary.name];

  // Compose authored per-state ARIA (`@aria`) over the reflected aria so
  // `aria-expanded`/`role` track the live state, not the SSR'd initial state.
  // `stateAttributes` rides the satellite from the build manifest by content
  // address; absent for boundaries with no `@aria`, where this is a no-op.
  const authored = stateName ? boundary.stateAttributes?.[stateName] : undefined;
  // Authored per-state GPU uniforms for the LIVE state, composed over the
  // normalized outputs (which hold the compositor's live `u_state`/`state_index`)
  // so a crossing carries both the index and the authored values in
  // `detail.glsl` / `detail.wgsl` — the GPU analog of the authored-aria
  // composition. Each rides its own payload field and is a no-op when absent.
  const authoredGlsl = stateName ? boundary.glslStateUniforms?.[stateName] : undefined;
  const authoredWgsl = stateName ? boundary.stateWgsl?.[stateName] : undefined;
  const detail: BoundaryStateDetail = {
    ...normalized,
    ...(authored
      ? {
          aria: {
            ...normalized.aria,
            ...Object.fromEntries(
              Object.entries(authored).filter(([attribute]) => BoundaryAttribute.isAllowedKey(attribute)),
            ),
          },
        }
      : {}),
    ...(authoredGlsl ? { glsl: { ...normalized.glsl, ...authoredGlsl } } : {}),
    ...(authoredWgsl ? { wgsl: { ...normalized.wgsl, ...authoredWgsl } } : {}),
  };

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
