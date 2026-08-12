// Projection fidelity, material capability, and authored temporal meaning.
//
// The predecessor encoded a three-way disposition as a boolean beside two
// optionals, and left material silent about what it can reach. Every mutation
// here is a route back to one of those, or to an entity that declares its own
// egress roster instead of composing one.

import { runBank } from '../harness.mjs';

const SC = '00_core/11_scene/types.ts';

const M = [
  // --- the fidelity algebra ------------------------------------------------
  ['fidelity collapses back to a boolean beside two optionals', SC,
    `export type ProjectionFidelity = Algebra<{
  exact: Record<never, never>;
  approximate: { readonly tolerance: ToleranceProfileReference };
  fallback: { readonly egress: SceneEgress; readonly reason: string };
  unsupported: {
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
    readonly remediation: string;
  };
}>;`,
    `export type ProjectionFidelity = Algebra<{
  declared: {
    readonly exact: boolean;
    readonly tolerance?: number;
    readonly fallback?: SceneEgress;
  };
}>;`],

  ['the exact arm acquires a tolerance', SC,
    `  exact: Record<never, never>;`,
    `  exact: { readonly tolerance: ToleranceProfileReference };`],

  ['the approximate arm loses its bound', SC,
    `  approximate: { readonly tolerance: ToleranceProfileReference };`,
    `  approximate: Record<never, never>;`],

  ['the tolerance goes back to a bare number', SC,
    `  approximate: { readonly tolerance: ToleranceProfileReference };`,
    `  approximate: { readonly tolerance: number };`],

  ['the fallback arm stops naming an alternative egress', SC,
    `  fallback: { readonly egress: SceneEgress; readonly reason: string };`,
    `  fallback: { readonly reason: string };`],

  ['the unsupported arm goes silent', SC,
    `  unsupported: {
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
    readonly remediation: string;
  };`,
    `  unsupported: Record<never, never>;`],

  ['unsupported diagnostics accept an empty population', SC,
    `  unsupported: {
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
    readonly remediation: string;
  };`,
    `  unsupported: {
    readonly diagnostics: readonly Diagnostic[];
    readonly remediation: string;
  };`],

  ['the unsupported arm drops its remediation', SC,
    `  unsupported: {
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
    readonly remediation: string;
  };`,
    `  unsupported: {
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
  };`],

  // --- who declares support ------------------------------------------------
  ['material stops declaring what it can reach', SC,
    `  readonly value: MaterialValue;
  readonly capabilities: MaterialCapabilities;`,
    `  readonly value: MaterialValue;`],

  ['material support becomes optional', SC,
    `export interface MaterialCapabilities {
  readonly projections: NonEmptyTuple<ProjectionSupport>;
}`,
    `export interface MaterialCapabilities {
  readonly projections?: NonEmptyTuple<ProjectionSupport>;
}`],

  ['material support accepts an empty roster', SC,
    `export interface MaterialCapabilities {
  readonly projections: NonEmptyTuple<ProjectionSupport>;
}`,
    `export interface MaterialCapabilities {
  readonly projections: readonly ProjectionSupport[];
}`],

  ['geometry support accepts an empty roster', SC,
    `  readonly projections: NonEmptyTuple<ProjectionSupport>;
  readonly interpolation: GeometryInterpolation;`,
    `  readonly projections: readonly ProjectionSupport[];
  readonly interpolation: GeometryInterpolation;`],

  ['material invents a second projection vocabulary', SC,
    `export interface MaterialCapabilities {
  readonly projections: NonEmptyTuple<ProjectionSupport>;
}`,
    `export interface MaterialCapabilities {
  readonly projections: NonEmptyTuple<{ readonly egress: SceneEgress; readonly exact: boolean }>;
}`],

  ['an entity acquires its own egress roster', SC,
    `  readonly geometry?: GeometryReference;
  readonly material?: MaterialReference;
  readonly visible: boolean;`,
    `  readonly geometry?: GeometryReference;
  readonly material?: MaterialReference;
  readonly projections: NonEmptyTuple<ProjectionSupport>;
  readonly visible: boolean;`],

  ['an entity acquires its own capability declaration', SC,
    `  readonly geometry?: GeometryReference;
  readonly material?: MaterialReference;
  readonly visible: boolean;`,
    `  readonly geometry?: GeometryReference;
  readonly material?: MaterialReference;
  readonly capabilities: MaterialCapabilities;
  readonly visible: boolean;`],

  // --- authored temporal meaning -------------------------------------------
  ['the timeline stops carrying authored markers', SC,
    `  readonly tracks: readonly TimelineTrack<Base>[];
  readonly markers: readonly SceneMarker<Base>[];`,
    `  readonly tracks: readonly TimelineTrack<Base>[];`],

  ['an authored envelope describes its own curve instead of naming an interpolator', SC,
    `  readonly keys: NonEmptyTuple<TimelineKey<Value, Base>>;
  readonly interpolator: InterpolatorReference;`,
    `  readonly keys: NonEmptyTuple<TimelineKey<Value, Base>>;
  readonly easing: { readonly kind: 'linear' | 'cubic'; readonly control: readonly number[] };`],

  ['an authored envelope accepts an empty key population', SC,
    `  readonly keys: NonEmptyTuple<TimelineKey<Value, Base>>;
  readonly interpolator: InterpolatorReference;`,
    `  readonly keys: readonly TimelineKey<Value, Base>[];
  readonly interpolator: InterpolatorReference;`],
];

process.exit(runBank('scene-fidelity', M).clean ? 0 : 1);
