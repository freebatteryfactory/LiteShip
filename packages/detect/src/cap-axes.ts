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

/** Project a tier triple onto the exact field vocabulary owned by {@link CAP_AXES}. */
export function projectCapabilityAxisValues(source: CapabilityTierProjection): CapabilityAxisValues {
  return Object.freeze(
    Object.fromEntries(CAP_AXES.map((axis) => [axis, source[CAPABILITY_AXIS_SOURCE_FIELDS[axis]]])),
  ) as unknown as CapabilityAxisValues;
}

/**
 * The `<html>` data-attribute name for a capability axis. The suffix IS the
 * axis key (a template literal), so an attribute name that disagrees with its
 * locals field cannot be constructed.
 */
export function capAxisAttr(axis: CapAxis): `data-liteship-${CapAxis}` {
  return `data-liteship-${axis}`;
}
