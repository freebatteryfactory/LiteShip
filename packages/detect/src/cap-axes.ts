/**
 * The capability axes carved by detection — the single source of truth for the
 * `data-liteship-*` capability vocabulary.
 *
 * Each axis is BOTH a public, author-facing CSS-keying attribute on `<html>`
 * (`data-liteship-<axis>`) AND a field on `Astro.locals.liteship.tiers`. The axis key
 * IS both names, projected through {@link capAxisAttr} as a template literal —
 * so a DOM attribute that disagrees with its locals field is unrepresentable.
 * This is what closes the `data-liteship-cap`-vs-`data-liteship-tier` drift: one
 * source, projected to the emitter, the locals, and the runtime readers.
 *
 * @module
 */

import type { CapTier } from '@liteship/core';
import { ValidationError } from '@liteship/error';
import type { DesignTier, MotionTier } from './tiers.js';

/**
 * The capability axes, in emit order. The single source of truth: the edge
 * emitter, `Astro.locals.liteship.tiers`, and the runtime readers all project from
 * this list, so their names can never drift apart.
 */
export const CAP_AXES = ['tier', 'motion', 'design'] as const;

/**
 * A capability axis — simultaneously the `Astro.locals.liteship.tiers` field name
 * and the `data-liteship-<axis>` attribute suffix.
 */
export type CapAxis = (typeof CAP_AXES)[number];

/** Source tier triple accepted by {@link projectCapabilityAxisValues}. */
export interface CapabilityTierProjection {
  readonly capTier: CapTier;
  readonly motionTier: MotionTier;
  readonly designTier: DesignTier;
}

const CAPABILITY_AXIS_SOURCE_FIELDS = {
  tier: 'capTier',
  motion: 'motionTier',
  design: 'designTier',
} as const satisfies Record<CapAxis, keyof CapabilityTierProjection>;

/** Values projected onto every canonical capability axis. */
export type CapabilityAxisValues = {
  readonly [Axis in CapAxis]: CapabilityTierProjection[(typeof CAPABILITY_AXIS_SOURCE_FIELDS)[Axis]];
};

/** Primitive capability inputs that the three tier ladders actually read. */
export const CAPABILITY_EVIDENCE_INPUTS = [
  'gpu',
  'cores',
  'memory',
  'webgpu',
  'prefersReducedMotion',
  'prefersContrast',
  'forcedColors',
  'prefersReducedTransparency',
  'dynamicRange',
  'colorGamut',
  'updateRate',
] as const;

/** One primitive input whose provenance contributes to a tier decision. */
export type CapabilityEvidenceInput = (typeof CAPABILITY_EVIDENCE_INPUTS)[number];

/** Whether a primitive was measured or filled by a documented fallback/heuristic. */
export type CapabilityEvidenceSupport = 'observed' | 'inferred';

/** Provenance for one primitive capability value. */
export interface CapabilityInputEvidence {
  readonly input: CapabilityEvidenceInput;
  readonly support: CapabilityEvidenceSupport;
  /** The concrete probe, hint, heuristic, or fallback that supplied the value. */
  readonly source: string;
}

/** Exhaustive provenance map for the primitive inputs used by the tier ladders. */
export type CapabilityEvidenceInputs = Readonly<{
  [Input in CapabilityEvidenceInput]: CapabilityInputEvidence & { readonly input: Input };
}>;

const CAPABILITY_AXIS_INPUTS = {
  tier: ['gpu', 'cores', 'memory', 'webgpu', 'prefersReducedMotion'],
  motion: ['gpu', 'cores', 'webgpu', 'prefersReducedMotion'],
  design: ['prefersContrast', 'forcedColors', 'prefersReducedTransparency', 'dynamicRange', 'colorGamut', 'updateRate'],
} as const satisfies Readonly<Record<CapAxis, readonly CapabilityEvidenceInput[]>>;

/** One complete tier value paired with the provenance of every input that shaped it. */
export interface CapabilityAxisEvidence<Axis extends CapAxis = CapAxis> {
  readonly axis: Axis;
  readonly value: CapabilityAxisValues[Axis];
  readonly support: CapabilityEvidenceSupport;
  readonly inputs: readonly CapabilityInputEvidence[];
}

/** Per-axis evidence for the complete capability-tier projection. */
export type CapabilityTierEvidence = Readonly<{
  [Axis in CapAxis]: CapabilityAxisEvidence<Axis>;
}>;

declare const OBSERVED_CAPABILITY_AXES: unique symbol;

/** Immutable tier values whose requested axes have all been witnessed as observed. */
export type ObservedCapabilityAxisValues<Axis extends CapAxis = CapAxis> = Readonly<
  Pick<CapabilityAxisValues, Axis>
> & {
  readonly [OBSERVED_CAPABILITY_AXES]: Axis;
};

/** Project a tier triple onto the exact field vocabulary owned by {@link CAP_AXES}. */
export function projectCapabilityAxisValues(source: CapabilityTierProjection): CapabilityAxisValues {
  return Object.freeze(
    Object.fromEntries(CAP_AXES.map((axis) => [axis, source[CAPABILITY_AXIS_SOURCE_FIELDS[axis]]])),
  ) as unknown as CapabilityAxisValues;
}

/** Build one frozen per-axis receipt from complete values and exhaustive primitive provenance. */
export function projectCapabilityTierEvidence(
  source: CapabilityTierProjection,
  inputs: CapabilityEvidenceInputs,
): CapabilityTierEvidence {
  const values = projectCapabilityAxisValues(source);
  return Object.freeze(
    Object.fromEntries(
      CAP_AXES.map((axis) => {
        const axisInputs = Object.freeze(CAPABILITY_AXIS_INPUTS[axis].map((input) => inputs[input]));
        return [
          axis,
          Object.freeze({
            axis,
            value: values[axis],
            support: axisInputs.every((entry) => entry.support === 'observed') ? 'observed' : 'inferred',
            inputs: axisInputs,
          }),
        ];
      }),
    ),
  ) as CapabilityTierEvidence;
}

/**
 * Admit only axes backed entirely by observed inputs.
 *
 * Complete fallback values remain available through {@link CapabilityAxisValues};
 * this boundary is for consumers whose claim requires measurement rather than a
 * conservative default. The returned witnessed view is frozen and contains only
 * the requested axes.
 */
export function requireObserved(evidence: CapabilityTierEvidence): ObservedCapabilityAxisValues;
export function requireObserved<const Axes extends readonly CapAxis[]>(
  evidence: CapabilityTierEvidence,
  axes: Axes,
): ObservedCapabilityAxisValues<Axes[number]>;
export function requireObserved(
  evidence: CapabilityTierEvidence,
  axes: readonly CapAxis[] = CAP_AXES,
): ObservedCapabilityAxisValues {
  const missing = axes.flatMap((axis) => {
    const inferred = evidence[axis].inputs.filter((entry) => entry.support === 'inferred');
    if (inferred.length > 0) {
      return [`${axis} (${inferred.map((entry) => `${entry.input} via ${entry.source}`).join(', ')})`];
    }
    return evidence[axis].support === 'observed' ? [] : [`${axis} (receipt is inferred but names no inferred input)`];
  });
  if (missing.length > 0) {
    throw ValidationError(
      'requireObserved',
      `requested capability axes are not fully observed: ${missing.join('; ')}. ` +
        'Use the complete conservative values for rendering, or acquire the named inputs before making a trust-bearing claim.',
    );
  }
  return Object.freeze(
    Object.fromEntries(axes.map((axis) => [axis, evidence[axis].value])),
  ) as ObservedCapabilityAxisValues;
}

/**
 * The `<html>` data-attribute name for a capability axis. The suffix IS the
 * axis key (a template literal), so an attribute name that disagrees with its
 * locals field cannot be constructed.
 */
export function capAxisAttr(axis: CapAxis): `data-liteship-${CapAxis}` {
  return `data-liteship-${axis}`;
}
