/**
 * Quality-tier congruence drift guard.
 *
 * The capability-admissibility quality-tier scale is encoded ONCE as pure
 * index-keyed data in `@liteship/core`'s `quality-tiers.ts` (`QUALITY_TIER_TARGETS`).
 * Two vocabularies project it:
 *
 *   - the core escalation chooser's `TIER_TARGET_SETS`, keyed by the `CapTier`
 *     lattice (`static < styled < reactive < animated < gpu`), read here via
 *     the module-internal `tierTargets(tier)` accessor; and
 *   - the quantizer's `TIER_TARGETS`, keyed by the `MotionTier` lattice
 *     (`none < transitions < animations < physics < compute`).
 *
 * Before this refactor the two tables were hand-typed independently — the exact
 * core↔quantizer near-cycle workaround that let them drift. They now both call
 * `projectQualityTiers`, so this guard proves the two projections are congruent
 * index-for-index. Every `expected` is computed from the `QUALITY_TIER_TARGETS`
 * source of truth, never hardcoded — a regression in either projection (or in
 * `projectQualityTiers`) fails here.
 */

import { describe, test, expect } from 'vitest';
import { QUALITY_TIER_TARGETS, QUALITY_TIER_COUNT, projectQualityTiers } from '@liteship/core';
import type { CapTier, QualityTierTarget } from '@liteship/core';
// `tierTargets` is module-internal (not re-exported via the @liteship/core public
// surface on purpose — it would hand out the mutable escalation Set table). The
// src-path import reaches the pure accessor without widening the public API.
import { tierTargets } from '../../../../packages/core/src/evidence/escalation.js';
import { TIER_TARGETS } from '@liteship/quantizer/testing';
import type { MotionTier } from '@liteship/core';

// The two vocabularies' tier orders, lowest-to-highest. These ARE the projection
// inputs; the test asserts each projection equals `QUALITY_TIER_TARGETS[i]`, so the
// orders here are the only thing a vocabulary contributes.
const CAP_TIER_ORDER: readonly CapTier[] = ['static', 'styled', 'reactive', 'animated', 'gpu'];
const MOTION_TIER_ORDER: readonly MotionTier[] = ['none', 'transitions', 'animations', 'physics', 'compute'];

const setEq = (a: ReadonlySet<unknown>, b: ReadonlySet<unknown>): boolean =>
  a.size === b.size && [...a].every((x) => b.has(x));

describe('quality-tier congruence', () => {
  test('both vocabularies have exactly QUALITY_TIER_COUNT tiers', () => {
    expect(CAP_TIER_ORDER.length).toBe(QUALITY_TIER_COUNT);
    expect(MOTION_TIER_ORDER.length).toBe(QUALITY_TIER_COUNT);
  });

  test('core TIER_TARGET_SETS (via tierTargets) is the CapTier projection of QUALITY_TIER_TARGETS', () => {
    CAP_TIER_ORDER.forEach((tier, i) => {
      const expected = new Set<QualityTierTarget>(QUALITY_TIER_TARGETS[i]!);
      expect(setEq(tierTargets(tier), expected)).toBe(true);
    });
  });

  test('quantizer TIER_TARGETS is the MotionTier projection of QUALITY_TIER_TARGETS', () => {
    MOTION_TIER_ORDER.forEach((tier, i) => {
      const expected = new Set<QualityTierTarget>(QUALITY_TIER_TARGETS[i]!);
      expect(setEq(TIER_TARGETS[tier], expected)).toBe(true);
    });
  });

  test('the two projections are congruent tier-for-tier (same admitted targets at each ordinal)', () => {
    for (let i = 0; i < QUALITY_TIER_COUNT; i++) {
      const capTier = tierTargets(CAP_TIER_ORDER[i]!);
      const motionTier = TIER_TARGETS[MOTION_TIER_ORDER[i]!];
      expect(setEq(capTier, motionTier)).toBe(true);
    }
  });

  test('the scale is monotone non-strict (each tier is a superset of the one below)', () => {
    // The fixed comment-drift law (G-1): styled == reactive (index 1 == index 2)
    // admit the same targets, so the scale is a NON-STRICT superset chain.
    for (let i = 1; i < QUALITY_TIER_COUNT; i++) {
      const lower = new Set<QualityTierTarget>(QUALITY_TIER_TARGETS[i - 1]!);
      const upper = new Set<QualityTierTarget>(QUALITY_TIER_TARGETS[i]!);
      expect([...lower].every((t) => upper.has(t))).toBe(true);
    }
    // And it is non-strict somewhere: index 1 and index 2 are equal.
    expect(setEq(new Set(QUALITY_TIER_TARGETS[1]!), new Set(QUALITY_TIER_TARGETS[2]!))).toBe(true);
  });

  test('projectQualityTiers rejects a vocabulary with the wrong tier count', () => {
    expect(() => projectQualityTiers(['static', 'styled'])).toThrow(/expects exactly/);
  });
});
