/**
 * AdaptiveDef -- the pure-lowering facade over the constraint-rendering
 * constructors.
 *
 * `defineAdaptive` does NOT reimplement boundary/style/quantizer/token/theme
 * construction: it LOWERS a single spec into the exact hand-lowered constructor
 * outputs. Every member of the returned {@link Adaptive} is referentially /
 * content-address identical to what you would get calling the sibling
 * constructors by hand — the quantizer member is the SAME object the
 * `@liteship/quantizer` configCache returns for the same input. The aggregate
 * `id` is the FNV-1a content address of the member ids (never the member data),
 * so an adaptive is addressed by what it lowers to.
 *
 * @module
 */

import type { ContentAddress } from '../schema/brands.js';
import { CanonicalCbor } from '../schema/cbor.js';
import { fnv1aBytes } from '../internal/fnv.js';
import { defineBoundary, Boundary } from './boundary.js';
import type { Boundary as BoundaryType } from './boundary.js';
import { defineStyle, Style } from './style.js';
import type { Style as StyleType } from './style.js';
import { defineToken } from './token.js';
import type { Token } from './token.js';
import { defineTheme } from './theme.js';
import type { Theme } from './theme.js';
import type { CapTier } from '../evidence/caps.js';
import { tierTargets } from '../evidence/escalation.js';
import type { TierChoice } from '../evidence/escalation.js';
import { HostCapabilityError } from '@liteship/error';
// `@liteship/core` takes NO import — not even type-only — on `@liteship/quantizer`
// or `@liteship/compiler`. Both DEPEND ON core, so a back-import (even a type one,
// whose `.d.ts` resolution loops back to `core/dist`) closes a project-reference
// build cycle (`tsc --build` TS5055) and crashes core's module init — the same
// cycle discipline `evidence/escalation.ts` documents and `schema/quantizer-types.ts`
// follows (core-local structural twins of the quantizer's own types). The authored
// quantizer config/options below are those structural twins; the REAL, MEMOIZED
// constructors are injected at load time through the seam, so `defineAdaptive`
// still LOWERS through the exact configCache-backed `defineQuantizer` (referential
// identity holds) and the exact `StyleCSSCompiler.compile` — never a reimplementation.

// ---------------------------------------------------------------------------
// Quantizer config/options — core-local structural twins
// ---------------------------------------------------------------------------
//
// The canonical `QuantizerConfig` / `DefineQuantizerOptions` live in
// `@liteship/quantizer`; core cannot import them (it depends on core). These are
// their structural twins — the same pattern `schema/quantizer-types.ts` uses for
// the live `Quantizer` contract. At runtime an adaptive's `quantizer` member IS
// the real, memoized `QuantizerConfig` object (referential identity holds);
// statically it is typed against this twin.

/** Per-target output tables keyed by state (`{ css: { sm: {...}, md: {...} } }`). */
type AdaptiveQuantizerOutputs = Readonly<Record<string, Readonly<Record<string, unknown>>>>;

/** Structural twin of `@liteship/quantizer`'s `DefineQuantizerOptions`. */
export interface AdaptiveQuantizeOptions {
  readonly outputs: AdaptiveQuantizerOutputs;
  readonly tier?: string;
  readonly spring?: unknown;
  readonly force?: readonly string[];
}

/** Structural twin of `@liteship/quantizer`'s `QuantizerConfig` (the authored, content-addressed config). */
export interface AdaptiveQuantizerConfig<B extends BoundaryType = BoundaryType> {
  readonly boundary: B;
  readonly outputs: AdaptiveQuantizerOutputs;
  readonly id: ContentAddress;
  readonly tier?: string;
  readonly spring?: unknown;
  readonly force?: readonly string[];
}

/** The injected `@liteship/quantizer` `defineQuantizer`, typed against the twins. */
export type AdaptiveQuantizerLowering = (
  boundary: BoundaryType,
  options: AdaptiveQuantizeOptions,
) => AdaptiveQuantizerConfig;

// ---------------------------------------------------------------------------
// Spec
// ---------------------------------------------------------------------------

/**
 * The authored intent of an adaptive: exactly the five sibling constructor
 * configs, one field each. `defineAdaptive` feeds each field to its constructor
 * verbatim — `boundary` to {@link defineBoundary}, `style` to {@link defineStyle}
 * (with the constructed boundary spliced in), `quantize` to `defineQuantizer`
 * (the injected `@liteship/quantizer` seam), each `tokens` entry to {@link defineToken}, and
 * `theme` to {@link defineTheme}. Nothing here is re-shaped, so the lowering is a
 * pure delegation.
 */
export interface AdaptiveSpec {
  /** {@link defineBoundary} config — the constraint the adaptive tracks. */
  readonly boundary: Parameters<typeof defineBoundary>[0];
  /** {@link defineStyle} config WITHOUT `boundary` (the boundary is spliced in by the lowering). */
  readonly style: Omit<Parameters<typeof defineStyle>[0], 'boundary'>;
  /** Optional `defineQuantizer` options (`outputs` + optional `tier`/`spring`/`force`). */
  readonly quantize?: AdaptiveQuantizeOptions;
  /** Optional design tokens, each a {@link defineToken} config. */
  readonly tokens?: readonly Parameters<typeof defineToken>[0][];
  /** Optional {@link defineTheme} config. */
  readonly theme?: Parameters<typeof defineTheme>[0];
  /** Capability tier {@link Adaptive.explain} reports; defaults to `'styled'`. */
  readonly tier?: CapTier;
}

// ---------------------------------------------------------------------------
// Explanation / plan shapes
// ---------------------------------------------------------------------------

/**
 * One threshold's contribution to the evaluated state — the per-threshold row of
 * {@link AdaptiveExplanation.boundary.matched}. `state` is the state a value
 * enters AT or ABOVE `threshold` (`boundary.states[index]`, since `threshold`
 * is that state's lower bound), and `satisfied` is `value >= threshold`.
 */
export interface ConstraintTrace {
  /** Index of the threshold in `boundary.thresholds`. */
  readonly index: number;
  /** The numeric threshold value. */
  readonly threshold: number;
  /** The state entered at or above this threshold (`boundary.states[index]`). */
  readonly state: string;
  /** Whether the evaluated value clears this threshold (`value >= threshold`). */
  readonly satisfied: boolean;
}

/**
 * The full explanation of an adaptive at one input value — what state the
 * boundary resolves to, which thresholds are satisfied, the quantizer's per-
 * target output for that state, the resolved style layer, and the capability
 * tier. Pure projection of the members; never recomputes their identity.
 */
export interface AdaptiveExplanation {
  /** The boundary's signal input name. */
  readonly input: string;
  /** The evaluated value. */
  readonly value: number;
  readonly boundary: {
    /** The boundary's content address (`adaptive.boundary.id`). */
    readonly id: ContentAddress;
    /** The resolved state at `value` (via `Boundary.evaluateResult`). */
    readonly state: string;
    /** Per-threshold trace: which thresholds `value` satisfies and the state each enters. */
    readonly matched: readonly ConstraintTrace[];
  };
  /** Per-target quantizer output for the resolved state, keyed by output target. */
  readonly quantized?: Readonly<Record<string, { readonly state: string; readonly value: unknown }>>;
  /** The resolved style properties at the state, each tagged with its source layer. */
  readonly style: Readonly<Record<string, { readonly value: string; readonly source: 'base' | 'state' }>>;
  /** The capability tier and the projection targets it admits. */
  readonly tier: TierChoice;
  /** The adaptive's aggregate content address (`adaptive.id`). */
  readonly contentAddress: ContentAddress;
}

/**
 * The build-time plan of an adaptive: the member content addresses, the compiled
 * CSS (the `@layer`-wrapped boundary + style CSS), and the headless DOM attrs.
 * Everything projects from the members — no recomputation of identity.
 */
export interface AdaptivePlan {
  readonly boundaryId: ContentAddress;
  readonly styleId: ContentAddress;
  readonly quantizerId?: ContentAddress;
  /** `StyleCSSCompiler.compile(style).layers` — the cascade-layered scoped CSS. */
  readonly css: string;
  /** The headless boundary attr set (`Adaptive.attrs()`). */
  readonly attrs: Readonly<Record<string, string>>;
}

// ---------------------------------------------------------------------------
// Adaptive
// ---------------------------------------------------------------------------

/**
 * A lowered adaptive: the five constructor outputs plus their aggregate content
 * address and three pure projections (`attrs`, `explain`, `plan`). Each member
 * IS the hand-lowered constructor output — same content address, and for the
 * quantizer the SAME object the configCache returns.
 */
export interface Adaptive {
  /** `defineBoundary(spec.boundary)`. */
  readonly boundary: BoundaryType;
  /** `defineStyle({ boundary, ...spec.style })`. */
  readonly style: StyleType;
  /** `defineQuantizer(boundary, spec.quantize)` — undefined when `spec.quantize` is omitted. */
  readonly quantizer?: AdaptiveQuantizerConfig;
  /** `spec.tokens.map(defineToken)` — undefined when `spec.tokens` is omitted. */
  readonly tokens?: readonly Token[];
  /** `defineTheme(spec.theme)` — undefined when `spec.theme` is omitted. */
  readonly theme?: Theme;
  /** FNV-1a content address of `{ boundary, style, quantizer, tokens, theme }` ids. */
  readonly id: ContentAddress;
  /** The headless DOM attr set a boundary-aware consumer needs. */
  attrs(): Record<string, string>;
  /** Explain the adaptive at one input value (state, matched thresholds, quantized, style, tier). */
  explain(value: number): AdaptiveExplanation;
  /** The build-time plan (member ids, compiled CSS, attrs). */
  plan(): AdaptivePlan;
}

// ---------------------------------------------------------------------------
// Lowering seam — the injected, MEMOIZED constructors from the layers above core
// ---------------------------------------------------------------------------
//
// `defineAdaptive` must LOWER through the real `@liteship/quantizer`
// `defineQuantizer` (so the returned quantizer is the SAME configCache object
// the hand-lowered call returns — the P15 referential-identity thesis) and the
// real `@liteship/compiler` `StyleCSSCompiler.compile`. Both packages DEPEND ON
// core, so core cannot import them (a runtime edge closes a build/init cycle).
// Instead each package REGISTERS its constructor here when it loads — the same
// module instance a consumer imports, so identity is preserved with zero new
// core→(quantizer|compiler) edges.

/** The injected `@liteship/compiler` style→layers compiler (`StyleCSSCompiler.compile(style).layers`). */
type StyleLayerCompiler = (style: StyleType) => string;

let injectedDefineQuantizer: AdaptiveQuantizerLowering | undefined;
let injectedStyleLayerCompiler: StyleLayerCompiler | undefined;

/**
 * Register `@liteship/quantizer`'s `defineQuantizer` as the adaptive quantizer
 * lowering. Called ONCE by `@liteship/quantizer` at load. Internal seam
 * (`_`-prefixed): not part of the public authoring surface.
 */
export function _registerAdaptiveQuantizerLowering(defineQuantizer: AdaptiveQuantizerLowering): void {
  injectedDefineQuantizer = defineQuantizer;
}

/**
 * Register `@liteship/compiler`'s `StyleCSSCompiler.compile(style).layers` as the
 * adaptive style-layer compiler. Called ONCE by `@liteship/compiler` at load.
 * Internal seam (`_`-prefixed): not part of the public authoring surface.
 */
export function _registerAdaptiveStyleLayerCompiler(compile: StyleLayerCompiler): void {
  injectedStyleLayerCompiler = compile;
}

function requireDefineQuantizer(): AdaptiveQuantizerLowering {
  if (injectedDefineQuantizer === undefined) {
    throw HostCapabilityError(
      '@liteship/quantizer',
      'defineAdaptive: `spec.quantize` requires `@liteship/quantizer` to be loaded so the adaptive can LOWER through its memoized `defineQuantizer`. Import from `@liteship/quantizer` (or use `liteship`) in the same process before defining a quantized adaptive.',
    );
  }
  return injectedDefineQuantizer;
}

function requireStyleLayerCompiler(): StyleLayerCompiler {
  if (injectedStyleLayerCompiler === undefined) {
    throw HostCapabilityError(
      '@liteship/compiler',
      'defineAdaptive: `plan()` compiles CSS through `@liteship/compiler` `StyleCSSCompiler`. Import from `@liteship/compiler` (or use `liteship`) in the same process before calling `plan()`.',
    );
  }
  return injectedStyleLayerCompiler;
}

// ---------------------------------------------------------------------------
// Boundary attr serializer (the ONE core↔astro source of key order)
// ---------------------------------------------------------------------------

/**
 * The boundary-identity object serialized into `data-liteship-boundary` —
 * `{ id, input, thresholds, states, hysteresis? }` in exactly that key order.
 * The SINGLE source of that order: `@liteship/astro`'s `adaptiveAttrs` spreads
 * this object then appends its component-specific extras, and the headless
 * {@link serializeBoundaryAttrValue} stringifies it directly — so the two can
 * never drift. `hysteresis` is present only when the boundary declares it
 * (`JSON.stringify` drops the `undefined` otherwise), matching the astro pin.
 */
export function boundaryAttrIdentity(boundary: BoundaryType): Record<string, unknown> {
  return {
    id: boundary.id,
    input: boundary.input,
    thresholds: boundary.thresholds,
    states: boundary.states,
    ...(boundary.hysteresis !== undefined ? { hysteresis: boundary.hysteresis } : {}),
  };
}

/**
 * JSON serialization of {@link boundaryAttrIdentity} — the headless
 * `data-liteship-boundary` value (no component extras). `@liteship/astro` builds
 * the same value by spreading {@link boundaryAttrIdentity} and appending its
 * extras, so both paths agree byte-for-byte on the boundary-identity prefix.
 */
export function serializeBoundaryAttrValue(boundary: BoundaryType): string {
  return JSON.stringify(boundaryAttrIdentity(boundary));
}

// ---------------------------------------------------------------------------
// defineAdaptive
// ---------------------------------------------------------------------------

/**
 * Aggregate content address of an adaptive — FNV-1a of the member IDs (never the
 * member data), matching how every sibling constructor builds its own id.
 */
function aggregateId(
  boundaryId: ContentAddress,
  styleId: ContentAddress,
  quantizerId: ContentAddress | null,
  tokenIds: readonly ContentAddress[] | null,
  themeId: ContentAddress | null,
): ContentAddress {
  return fnv1aBytes(
    CanonicalCbor.encode({
      _tag: 'AdaptiveDef',
      _version: 1,
      boundary: boundaryId,
      style: styleId,
      quantizer: quantizerId,
      tokens: tokenIds,
      theme: themeId,
    }),
  );
}

/**
 * Lower a single {@link AdaptiveSpec} into an {@link Adaptive} by CALLING the
 * five sibling constructors — never reimplementing them.
 *
 * Concretely: `boundary = defineBoundary(spec.boundary)`;
 * `style = defineStyle({ boundary, ...spec.style })`;
 * `quantizer = defineQuantizer(boundary, spec.quantize)` (the configCache makes
 * this referentially identical to the hand-lowered call);
 * `tokens = spec.tokens.map(defineToken)`; `theme = defineTheme(spec.theme)`.
 * The aggregate `id` addresses the member ids. `explain`/`attrs`/`plan` are pure
 * projections of those members.
 *
 * @example
 * ```ts
 * const adaptive = defineAdaptive({
 *   boundary: { input: 'viewport.width', at: [[0, 'sm'], [768, 'md'], [1024, 'lg']] },
 *   style: { base: { properties: { 'font-size': '14px' } }, states: { lg: { properties: { 'font-size': '18px' } } } },
 * });
 * adaptive.explain(800).boundary.state; // 'md'
 * ```
 */
export function defineAdaptive(spec: AdaptiveSpec): Adaptive {
  const boundary = defineBoundary(spec.boundary);
  const style = defineStyle({ boundary, ...spec.style });
  const quantizer = spec.quantize !== undefined ? requireDefineQuantizer()(boundary, spec.quantize) : undefined;
  const tokens = spec.tokens !== undefined ? spec.tokens.map((t) => defineToken(t)) : undefined;
  const theme = spec.theme !== undefined ? defineTheme(spec.theme) : undefined;

  const id = aggregateId(
    boundary.id,
    style.id,
    quantizer?.id ?? null,
    tokens !== undefined ? tokens.map((t) => t.id) : null,
    theme?.id ?? null,
  );

  const tier: CapTier = spec.tier ?? 'styled';

  const attrs = (): Record<string, string> => ({
    class: 'liteship-adaptive',
    'data-liteship-boundary': serializeBoundaryAttrValue(boundary),
    'data-liteship-state': boundary.states[0]!,
    'data-liteship-directive': 'adaptive',
  });

  const explain = (value: number): AdaptiveExplanation => {
    const result = Boundary.evaluateResult(boundary, value);
    const matched: ConstraintTrace[] = boundary.thresholds.map((threshold, index) => ({
      index,
      threshold,
      // `threshold` is the lower bound of `states[index]` (rawIndexF32 selects
      // the rightmost threshold <= value), so the state entered at/above it is
      // `states[index]`, not `states[index + 1]`.
      state: boundary.states[index]!,
      satisfied: value >= threshold,
    }));

    let quantized: Record<string, { readonly state: string; readonly value: unknown }> | undefined;
    if (quantizer !== undefined) {
      quantized = {};
      const outputs = quantizer.outputs as Readonly<Record<string, Record<string, unknown>>>;
      for (const target of Object.keys(outputs)) {
        const table = outputs[target];
        if (table === undefined) continue;
        quantized[target] = { state: result.state, value: table[result.state] };
      }
    }

    // Source detection: a property whose resolved value equals the base-only
    // resolution (and is present there) came from `base`; anything the state
    // layer introduced or overrode reads as `state`.
    const baseResolved = Style.tap(style);
    const stateResolved = Style.tap(style, result.state);
    const styleRecord: Record<string, { readonly value: string; readonly source: 'base' | 'state' }> = {};
    for (const [property, propValue] of Object.entries(stateResolved)) {
      const source: 'base' | 'state' =
        property in baseResolved && baseResolved[property] === propValue ? 'base' : 'state';
      styleRecord[property] = { value: propValue, source };
    }

    return {
      input: boundary.input,
      value,
      boundary: { id: boundary.id, state: result.state, matched },
      ...(quantized !== undefined ? { quantized } : {}),
      style: styleRecord,
      tier: { tier, admittedTargets: tierTargets(tier) },
      contentAddress: id,
    };
  };

  const plan = (): AdaptivePlan => ({
    boundaryId: boundary.id,
    styleId: style.id,
    ...(quantizer !== undefined ? { quantizerId: quantizer.id } : {}),
    css: requireStyleLayerCompiler()(style),
    attrs: attrs(),
  });

  return {
    boundary,
    style,
    ...(quantizer !== undefined ? { quantizer } : {}),
    ...(tokens !== undefined ? { tokens } : {}),
    ...(theme !== undefined ? { theme } : {}),
    id,
    attrs,
    explain,
    plan,
  };
}
