/**
 * AdaptiveDef -- the pure-lowering facade over the constraint-rendering
 * constructors.
 *
 * `lowerAdaptive` does NOT reimplement boundary/style/quantizer/token/theme
 * construction: it LOWERS a single spec into the exact hand-lowered constructor
 * outputs. Every member of the returned {@link Adaptive} is referentially /
 * content-address identical to what you would get calling the sibling
 * constructors by hand — the quantizer member is the SAME object the
 * `@liteship/quantizer` configCache returns for the same input. The aggregate
 * `id` is the FNV-1a content address of the normalized tier plus member ids
 * (never the member data), so an adaptive is addressed by what it lowers to.
 *
 * @module
 */

import type { ContentAddress } from '../schema/brands.js';
import { CanonicalCbor } from '../schema/cbor.js';
import { fnv1aBytes } from '../evidence/fnv.js';
import { defineBoundary, Boundary, boundaryWireSpec } from './boundary.js';
import type { Boundary as BoundaryType } from './boundary.js';
import { defineStyle, Style } from './style.js';
import type { Style as StyleType, StyleLayer } from './style.js';
import { defineToken } from './token.js';
import type { Token } from './token.js';
import { defineTheme } from './theme.js';
import type { Theme } from './theme.js';
import type { CapTier } from '../evidence/caps.js';
import { tierTargets } from '../evidence/escalation.js';
import type { TierChoice } from '../evidence/escalation.js';
import type { QualityTierTarget } from '../evidence/quality-tiers.js';
import type { MotionTier } from '../evidence/ui-quality.js';
// `@liteship/core` takes NO import — not even type-only — on `@liteship/quantizer`
// or `@liteship/compiler`. Both DEPEND ON core, so a back-import (even a type one,
// whose `.d.ts` resolution loops back to `core/dist`) closes a project-reference
// build cycle (`tsc --build` TS5055) and crashes core's module init — the same
// cycle discipline `evidence/escalation.ts` documents and `schema/quantizer-types.ts`
// follows (core-local structural twins of the quantizer's own types). The authored
// quantizer config/options below are those structural twins; the REAL, MEMOIZED
// constructors are supplied explicitly by the composition root, so adaptive
// lowering still delegates to the exact configCache-backed `defineQuantizer`
// (referential identity holds) and the exact `StyleCSSCompiler.compileAdaptive` — never
// a reimplementation and never a load-order-dependent ambient registration.

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

/**
 * Per-target output tables keyed by state (`{ css: { sm: {...}, md: {...} } }`).
 * The OUTER keys are CLOSED to the real quantizer target set ({@link QualityTierTarget}
 * = the `@liteship/quantizer` `OutputTarget`: css/glsl/wgsl/aria/ai) — the runtime
 * `resolveOutputs` resolves ONLY those targets, so an unrestricted `Record<string, …>`
 * would let a consumer write a phantom target (`{ cs: {...} }`) that typechecks,
 * survives into `Adaptive.explain()`, yet is silently dropped at runtime.
 */
type AdaptiveStateOutputs<State extends string, Value> = Readonly<Record<State, Readonly<Record<string, Value>>>>;

/** Structural twin of `@liteship/quantizer`'s exact per-target value contracts. */
export interface AdaptiveQuantizerOutputs<State extends string = string> {
  readonly css?: AdaptiveStateOutputs<State, string | number>;
  readonly glsl?: AdaptiveStateOutputs<State, number>;
  readonly wgsl?: AdaptiveStateOutputs<State, number>;
  readonly aria?: AdaptiveStateOutputs<State, string>;
  readonly ai?: AdaptiveStateOutputs<State, unknown>;
}

/** Structural twin of `@liteship/quantizer`'s spring contract. */
export interface AdaptiveSpringConfig {
  readonly stiffness: number;
  readonly damping: number;
  readonly mass?: number;
}

/** Structural twin of `@liteship/quantizer`'s `DefineQuantizerOptions`. */
export interface AdaptiveQuantizeOptions<State extends string = string> {
  readonly outputs: AdaptiveQuantizerOutputs<State>;
  readonly tier?: MotionTier;
  readonly spring?: AdaptiveSpringConfig;
  readonly force?: readonly QualityTierTarget[];
}

/** Structural twin of `@liteship/quantizer`'s `QuantizerConfig` (the authored, content-addressed config). */
export interface AdaptiveQuantizerConfig<B extends BoundaryType = BoundaryType> {
  readonly boundary: B;
  readonly outputs: AdaptiveQuantizerOutputs<B['states'][number] & string>;
  readonly id: ContentAddress;
  readonly tier?: MotionTier;
  readonly spring?: AdaptiveSpringConfig;
  readonly force?: readonly QualityTierTarget[];
}

/** The supplied `@liteship/quantizer` `defineQuantizer`, typed against the twins. */
export interface AdaptiveQuantizerLowering {
  <B extends BoundaryType>(
    boundary: B,
    options: AdaptiveQuantizeOptions<B['states'][number] & string>,
  ): AdaptiveQuantizerConfig<B>;
}

// ---------------------------------------------------------------------------
// Spec
// ---------------------------------------------------------------------------

type AdaptiveBoundarySpec = Parameters<typeof defineBoundary>[0];
type AdaptiveStates<B extends AdaptiveBoundarySpec> = B['at'][number][1] & string;

/**
 * The authored intent of an adaptive: exactly the five sibling constructor
 * configs, one field each. `lowerAdaptive` feeds each field to its constructor
 * verbatim — `boundary` to {@link defineBoundary}, `style` to {@link defineStyle}
 * (with the constructed boundary spliced in), `quantize` to `defineQuantizer`
 * (the explicitly supplied `@liteship/quantizer` owner), each `tokens` entry to {@link defineToken}, and
 * `theme` to {@link defineTheme}. Nothing here is re-shaped, so the lowering is a
 * pure delegation.
 */
export interface AdaptiveSpec<B extends AdaptiveBoundarySpec = AdaptiveBoundarySpec> {
  /** {@link defineBoundary} config — the constraint the adaptive tracks. */
  readonly boundary: B;
  /** {@link defineStyle} config WITHOUT `boundary` (the boundary is spliced in by the lowering). */
  readonly style: Omit<Parameters<typeof defineStyle>[0], 'boundary'>;
  /** Optional `defineQuantizer` options (`outputs` + optional `tier`/`spring`/`force`). */
  readonly quantize?: AdaptiveQuantizeOptions<AdaptiveStates<NoInfer<B>>>;
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
  readonly quantized?: Readonly<
    Partial<Record<QualityTierTarget, { readonly state: string; readonly value: unknown }>>
  >;
  /** The resolved style properties at the state, each tagged with its source layer. */
  readonly style: Readonly<Record<string, { readonly value: string; readonly source: 'base' | 'state' }>>;
  /** The Adaptive capability tier and the projection targets that capability admits. */
  readonly tier: TierChoice;
  /** The quantizer's distinct MotionTier gate, when this Adaptive owns a quantizer. */
  readonly quantizerTier?: {
    readonly tier: MotionTier | null;
    readonly force: readonly QualityTierTarget[];
    readonly admittedTargets: ReadonlySet<QualityTierTarget>;
  };
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
  /** Compiler-owned CSS driven by this Adaptive's runtime state marker. */
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
  /** FNV-1a content address of normalized tier + `{ boundary, style, quantizer, tokens, theme }` ids. */
  readonly id: ContentAddress;
  /** The headless DOM attr set a boundary-aware consumer needs. */
  attrs(): Record<string, string>;
  /** Explain the adaptive at one input value (state, matched thresholds, quantized, style, tier). */
  explain(value: number): AdaptiveExplanation;
  /** The build-time plan (member ids, compiled CSS, attrs). */
  plan(): AdaptivePlan;
}

// ---------------------------------------------------------------------------
// Explicit lowering contract — supplied by the composition root above core
// ---------------------------------------------------------------------------
//
// `lowerAdaptive` must LOWER through the real `@liteship/quantizer`
// `defineQuantizer` (so the returned quantizer is the SAME configCache object
// the hand-lowered call returns — the P15 referential-identity thesis) and the
// real `@liteship/compiler` `StyleCSSCompiler.compileAdaptive`. Both packages DEPEND ON
// core, so core cannot import them (a runtime edge closes a build/init cycle).
// Instead the composition root passes both owners explicitly for each lowering.
// There is no mutable registry, no side-effect import, and no import-order
// requirement. The function objects come from the same modules a hand-lowered
// consumer imports, preserving quantizer configCache identity.

/** The supplied `@liteship/compiler` Adaptive state-marker CSS projection. */
export interface AdaptiveLowering {
  /** The real memoized `@liteship/quantizer` constructor. */
  readonly defineQuantizer: AdaptiveQuantizerLowering;
  /** The quantizer owner's exact tier + force target resolver used by live dispatch. */
  readonly resolveQuantizerTargets: (
    tier: MotionTier | undefined,
    force: readonly QualityTierTarget[] | undefined,
  ) => ReadonlySet<QualityTierTarget>;
  /** The real `@liteship/compiler` state-marker projection. */
  readonly compileAdaptiveCss: (style: StyleType) => string;
}

// ---------------------------------------------------------------------------
// Boundary attr serializer (the ONE core↔astro source of key order)
// ---------------------------------------------------------------------------

/**
 * The boundary-identity object serialized into `data-liteship-boundary` —
 * `{ id, input, thresholds, states, hysteresis?, spec? }` in exactly that key order.
 * The SINGLE source of that order: `@liteship/astro`'s `adaptiveAttrs` spreads
 * this object then appends its component-specific extras, and the headless
 * {@link serializeBoundaryAttrValue} stringifies it directly — so the two can
 * never drift. Optional fields are present only when authored. The spec
 * projection deliberately carries only JSON-safe activation semantics;
 * `deviceFilter` remains host-only and never crosses the DOM wire.
 */
export function boundaryAttrIdentity(boundary: BoundaryType): Record<string, unknown> {
  const wireSpec = boundaryWireSpec(boundary.spec);
  return {
    id: boundary.id,
    input: boundary.input,
    thresholds: boundary.thresholds,
    states: boundary.states,
    ...(boundary.hysteresis !== undefined ? { hysteresis: boundary.hysteresis } : {}),
    ...(wireSpec !== undefined ? { spec: wireSpec } : {}),
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
// lowerAdaptive
// ---------------------------------------------------------------------------

/**
 * Aggregate content address of an adaptive — FNV-1a of the normalized tier and
 * member IDs (never the member data), matching how sibling constructors build ids.
 */
function aggregateId(
  boundaryId: ContentAddress,
  styleId: ContentAddress,
  quantizerId: ContentAddress | null,
  tokenIds: readonly ContentAddress[] | null,
  themeId: ContentAddress | null,
  tier: CapTier,
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
      tier,
    }),
  );
}

/**
 * Lower a single {@link AdaptiveSpec} into an {@link Adaptive} by CALLING the
 * five sibling constructors — never reimplementing them.
 *
 * Concretely: `boundary = defineBoundary(spec.boundary)`;
 * `style = defineStyle({ ...spec.style, boundary })` (generated boundary wins);
 * `quantizer = defineQuantizer(boundary, spec.quantize)` (the configCache makes
 * this referentially identical to the hand-lowered call);
 * `tokens = spec.tokens.map(defineToken)`; `theme = defineTheme(spec.theme)`.
 * The aggregate `id` addresses the normalized tier and member ids.
 * `explain`/`attrs`/`plan` are pure projections of those members.
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
export function lowerAdaptive<const B extends AdaptiveBoundarySpec>(
  spec: AdaptiveSpec<B>,
  lowering: AdaptiveLowering,
): Adaptive {
  const boundary = defineBoundary(spec.boundary);
  // The generated boundary is authoritative. A JavaScript caller can still
  // smuggle a `boundary` key through the type-level Omit, so splice it LAST.
  const style = defineStyle({ ...spec.style, boundary });
  const quantizer = spec.quantize !== undefined ? lowering.defineQuantizer(boundary, spec.quantize) : undefined;
  const tokens = spec.tokens !== undefined ? Object.freeze(spec.tokens.map((t) => defineToken(t))) : undefined;
  const theme = spec.theme !== undefined ? defineTheme(spec.theme) : undefined;
  const tier: CapTier = spec.tier ?? 'styled';

  const id = aggregateId(
    boundary.id,
    style.id,
    quantizer?.id ?? null,
    tokens !== undefined ? tokens.map((t) => t.id) : null,
    theme?.id ?? null,
    tier,
  );

  const attrs = (): Record<string, string> => ({
    // `StyleCSSCompiler.compileAdaptive` scopes runtime state rules to this
    // style content address. The pair is complete without container setup.
    class: 'liteship-adaptive liteship-styled',
    'data-liteship-boundary': serializeBoundaryAttrValue(boundary),
    'data-liteship-style': style.id,
    'data-liteship-state': boundary.states[0]!,
    'data-liteship-directive': 'adaptive',
  });

  const explain = (value: number): AdaptiveExplanation => {
    const result = Boundary.evaluateResult(boundary, value);
    const matched: readonly ConstraintTrace[] = Object.freeze(
      boundary.thresholds.map((threshold, index) => ({
        index,
        threshold,
        // `threshold` is the lower bound of `states[index]` (rawIndexF32 selects
        // the rightmost threshold <= value), so the state entered at/above it is
        // `states[index]`, not `states[index + 1]`.
        state: boundary.states[index]!,
        satisfied: value >= threshold,
      })),
    );

    let quantized: Partial<Record<QualityTierTarget, { readonly state: string; readonly value: unknown }>> | undefined;
    const capabilityTargets = tierTargets(tier);
    const quantizerTargets =
      quantizer === undefined ? undefined : lowering.resolveQuantizerTargets(quantizer.tier, quantizer.force);
    if (quantizer !== undefined) {
      quantized = {};
      const outputs = quantizer.outputs as Readonly<
        Partial<Record<QualityTierTarget, Readonly<Record<string, unknown>>>>
      >;
      for (const target of quantizerTargets!) {
        const table = outputs[target];
        if (table === undefined) continue;
        quantized[target] = { state: result.state, value: table[result.state] };
      }
    }

    // Source detection by DECLARATION, not value equality: a property is
    // `state`-sourced iff the resolved state's OWN layer declares it. A state that
    // re-declares a property with the SAME string as base is still a state
    // override — value equality would misattribute the winning declaration to
    // `base`. Properties the state layer does not declare fall through to `base`.
    const stateResolved = Style.tap(style, result.state);
    const statesByName = (style.states ?? {}) as Readonly<Record<string, StyleLayer | undefined>>;
    const stateLayer = statesByName[result.state];
    const stateDeclared = new Set<string>(Object.keys(stateLayer?.properties ?? {}));
    for (const [selector, properties] of Object.entries(stateLayer?.pseudo ?? {})) {
      for (const property of Object.keys(properties)) stateDeclared.add(`${selector}::${property}`);
    }
    if ((stateLayer?.boxShadow?.length ?? 0) > 0) stateDeclared.add('box-shadow');
    const styleRecord: Record<string, { readonly value: string; readonly source: 'base' | 'state' }> = {};
    for (const [property, propValue] of Object.entries(stateResolved)) {
      const source: 'base' | 'state' = stateDeclared.has(property) ? 'state' : 'base';
      styleRecord[property] = { value: propValue, source };
    }

    return {
      input: boundary.input,
      value,
      boundary: { id: boundary.id, state: result.state, matched },
      ...(quantized !== undefined ? { quantized } : {}),
      style: styleRecord,
      tier: { tier, admittedTargets: capabilityTargets },
      ...(quantizer !== undefined
        ? {
            quantizerTier: {
              tier: quantizer.tier ?? null,
              force: quantizer.force ?? Object.freeze([]),
              admittedTargets: quantizerTargets!,
            },
          }
        : {}),
      contentAddress: id,
    };
  };

  const plan = (): AdaptivePlan => ({
    boundaryId: boundary.id,
    styleId: style.id,
    ...(quantizer !== undefined ? { quantizerId: quantizer.id } : {}),
    css: lowering.compileAdaptiveCss(style),
    attrs: attrs(),
  });

  return Object.freeze({
    boundary,
    style,
    ...(quantizer !== undefined ? { quantizer } : {}),
    ...(tokens !== undefined ? { tokens } : {}),
    ...(theme !== undefined ? { theme } : {}),
    id,
    attrs,
    explain,
    plan,
  });
}
