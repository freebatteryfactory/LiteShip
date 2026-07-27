/**
 * The capability-admissibility quality-tier scale — the SINGLE source of truth
 * for which projection targets each tier of the 5 quality tiers admits.
 *
 * Two vocabularies index this same ordered scale: the {@link CapTier} lattice
 * (`static`..`gpu`) read by the core escalation chooser, and the `MotionTier`
 * lattice (`none`..`compute`) read by the quantizer's output gate, each ordered
 * lowest-capability to highest. They are the same index-keyed admissibility
 * table in two costumes. Encoding it ONCE here — as
 * pure index-keyed data with no dependency on either vocabulary's string union —
 * lets both `@liteship/core`'s `TIER_TARGET_SETS` and `@liteship/quantizer`'s `TIER_TARGETS`
 * PROJECT from one source, so the two can never drift.
 *
 * This module lives in `@liteship/core` rather than `@liteship/_spine` because `_spine`
 * is type-only (it ships no runtime JavaScript), and this is runtime DATA. The
 * quantizer already depends on core, so importing it here closes no cycle —
 * core does NOT import the quantizer, which is the near-cycle this lifting was
 * designed to dissolve.
 *
 * @module
 */

import { InvariantViolationError } from '@liteship/error';

/**
 * A projection target a quality tier may admit (the shared codomain of the core
 * escalation gate's `ProjectionTarget` and the quantizer's `OutputTarget`).
 */
export type QualityTierTarget = 'css' | 'glsl' | 'wgsl' | 'aria' | 'ai';

/**
 * The admissible targets at each of the 5 quality tiers, lowest (index 0) to
 * highest (index 4). Each tier is a NON-STRICT superset of the one below
 * (index 1 == index 2 admit the same targets — `css` arrives at index 1 and
 * `glsl` not until index 3), so the scale is monotone but not strictly
 * increasing.
 *
 * Frozen at the tier level so a consumer cannot mutate the shared source. The
 * projections below copy each tier into a fresh `Set` keyed by their own
 * vocabulary, so callers always get an isolated, mutation-safe value.
 */
export const QUALITY_TIER_TARGETS: readonly ReadonlyArray<QualityTierTarget>[] = Object.freeze([
  ['aria'],
  ['css', 'aria'],
  ['css', 'aria'],
  ['css', 'glsl', 'aria'],
  ['css', 'glsl', 'wgsl', 'aria', 'ai'],
] as const);

/** The number of quality tiers — both vocabularies have exactly this many. */
export const QUALITY_TIER_COUNT = QUALITY_TIER_TARGETS.length;

/**
 * Project {@link QUALITY_TIER_TARGETS} onto a vocabulary's ordered tier labels,
 * producing a `Record<Label, ReadonlySet<QualityTierTarget>>`. The `order` array is
 * the vocabulary's tiers lowest-to-highest; `order[i]` receives the targets at
 * quality-tier index `i`. Both `TIER_TARGET_SETS` (core) and `TIER_TARGETS` (quantizer)
 * are built by this single function, so a congruence guard need only compare
 * the two projections index-for-index.
 *
 * @throws if `order.length !== QUALITY_TIER_COUNT` — a vocabulary with the wrong
 * tier count cannot be a faithful projection of the scale, so the mismatch is loud.
 */
export function projectQualityTiers<Label extends string>(
  order: readonly Label[],
): Record<Label, ReadonlySet<QualityTierTarget>> {
  if (order.length !== QUALITY_TIER_COUNT) {
    throw InvariantViolationError(
      'quality-tiers.projectQualityTiers',
      `projection expects exactly ${QUALITY_TIER_COUNT} quality tiers, got ${order.length} ([${order.join(', ')}])`,
    );
  }
  const out = {} as Record<Label, ReadonlySet<QualityTierTarget>>;
  order.forEach((label, i) => {
    out[label] = new Set(QUALITY_TIER_TARGETS[i]);
  });
  return out;
}
