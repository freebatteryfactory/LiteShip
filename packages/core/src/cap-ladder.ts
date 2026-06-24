/**
 * The capability-admissibility ladder — the SINGLE source of truth for which
 * projection targets each rung of the 5-rung capability ladder admits.
 *
 * Two vocabularies index this same ordered ladder: the {@link CapTier} lattice
 * (`static`..`gpu`) read by the core escalation chooser, and the `MotionTier`
 * lattice (`none`..`compute`) read by the quantizer's output gate, each ordered
 * lowest-capability to highest. They are the same index-keyed admissibility
 * table in two costumes. Encoding it ONCE here — as
 * pure index-keyed data with no dependency on either vocabulary's string union —
 * lets both `@czap/core`'s `RUNG_TARGETS` and `@czap/quantizer`'s `TIER_TARGETS`
 * PROJECT from one source, so the two can never drift.
 *
 * This module lives in `@czap/core` rather than `@czap/_spine` because `_spine`
 * is type-only (it ships no runtime JavaScript), and this is runtime DATA. The
 * quantizer already depends on core, so importing it here closes no cycle —
 * core does NOT import the quantizer, which is the near-cycle this lifting was
 * designed to dissolve.
 *
 * @module
 */

import { InvariantViolationError } from '@czap/error';

/**
 * A projection target a rung may admit (the shared codomain of the core
 * escalation gate's `ProjectionTarget` and the quantizer's `OutputTarget`).
 */
export type LadderTarget = 'css' | 'glsl' | 'wgsl' | 'aria' | 'ai';

/**
 * The admissible targets at each of the 5 ladder rungs, lowest (index 0) to
 * highest (index 4). Each rung is a NON-STRICT superset of the one below
 * (index 1 == index 2 admit the same targets — `css` arrives at index 1 and
 * `glsl` not until index 3), so the ladder is monotone but not strictly
 * increasing.
 *
 * Frozen at the rung level so a consumer cannot mutate the shared source. The
 * projections below copy each rung into a fresh `Set` keyed by their own
 * vocabulary, so callers always get an isolated, mutation-safe value.
 */
export const LADDER_TARGETS: readonly ReadonlyArray<LadderTarget>[] = Object.freeze([
  ['aria'],
  ['css', 'aria'],
  ['css', 'aria'],
  ['css', 'glsl', 'aria'],
  ['css', 'glsl', 'wgsl', 'aria', 'ai'],
] as const);

/** The number of rungs on the capability ladder — both vocabularies have exactly this many. */
export const LADDER_RUNGS = LADDER_TARGETS.length;

/**
 * Project {@link LADDER_TARGETS} onto a vocabulary's ordered rung labels,
 * producing a `Record<Label, ReadonlySet<LadderTarget>>`. The `order` array is
 * the vocabulary's rungs lowest-to-highest; `order[i]` receives the targets at
 * ladder index `i`. Both `RUNG_TARGETS` (core) and `TIER_TARGETS` (quantizer)
 * are built by this single function, so a congruence guard need only compare
 * the two projections index-for-index.
 *
 * @throws if `order.length !== LADDER_RUNGS` — a vocabulary with the wrong rung
 * count cannot be a faithful projection of the ladder, so the mismatch is loud.
 */
export function projectLadder<Label extends string>(order: readonly Label[]): Record<Label, ReadonlySet<LadderTarget>> {
  if (order.length !== LADDER_RUNGS) {
    throw InvariantViolationError(
      'cap-ladder.projectLadder',
      `projection expects exactly ${LADDER_RUNGS} rungs, got ${order.length} ([${order.join(', ')}])`,
    );
  }
  const out = {} as Record<Label, ReadonlySet<LadderTarget>>;
  order.forEach((label, i) => {
    out[label] = new Set(LADDER_TARGETS[i]);
  });
  return out;
}
