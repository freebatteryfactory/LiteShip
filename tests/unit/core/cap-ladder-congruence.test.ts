/**
 * Cap-ladder congruence drift guard.
 *
 * The capability-admissibility ladder is encoded ONCE as pure index-keyed data
 * in `@liteship/core/cap-ladder` (`LADDER_TARGETS`). Two vocabularies project it:
 *
 *   - the core escalation chooser's `RUNG_TARGETS`, keyed by the `CapTier`
 *     lattice (`static < styled < reactive < animated < gpu`), read here via
 *     the module-internal `rungTargets(rung)` accessor; and
 *   - the quantizer's `TIER_TARGETS`, keyed by the `MotionTier` lattice
 *     (`none < transitions < animations < physics < compute`).
 *
 * Before this refactor the two tables were hand-typed independently — the exact
 * core↔quantizer near-cycle workaround that let them drift. They now both call
 * `projectLadder`, so this guard proves the two projections are congruent
 * index-for-index. Every `expected` is computed from the `LADDER_TARGETS`
 * source of truth, never hardcoded — a regression in either projection (or in
 * `projectLadder`) fails here.
 */

import { describe, test, expect } from 'vitest';
import { LADDER_TARGETS, LADDER_RUNGS, projectLadder } from '@liteship/core';
import type { CapTier, LadderTarget } from '@liteship/core';
// `rungTargets` is module-internal (not re-exported via the @liteship/core public
// surface on purpose — it would hand out the mutable escalation Set table). The
// src-path import reaches the pure accessor without widening the public API.
import { rungTargets } from '../../../packages/core/src/escalation.js';
import { TIER_TARGETS } from '@liteship/quantizer/testing';
import type { MotionTier } from '@liteship/core';

// The two vocabularies' rung orders, lowest-to-highest. These ARE the projection
// inputs; the test asserts each projection equals `LADDER_TARGETS[i]`, so the
// orders here are the only thing a vocabulary contributes.
const CAP_TIER_ORDER: readonly CapTier[] = ['static', 'styled', 'reactive', 'animated', 'gpu'];
const MOTION_TIER_ORDER: readonly MotionTier[] = ['none', 'transitions', 'animations', 'physics', 'compute'];

const setEq = (a: ReadonlySet<unknown>, b: ReadonlySet<unknown>): boolean =>
  a.size === b.size && [...a].every((x) => b.has(x));

describe('cap-ladder congruence', () => {
  test('both vocabularies have exactly LADDER_RUNGS rungs', () => {
    expect(CAP_TIER_ORDER.length).toBe(LADDER_RUNGS);
    expect(MOTION_TIER_ORDER.length).toBe(LADDER_RUNGS);
  });

  test('core RUNG_TARGETS (via rungTargets) is the CapTier projection of LADDER_TARGETS', () => {
    CAP_TIER_ORDER.forEach((rung, i) => {
      const expected = new Set<LadderTarget>(LADDER_TARGETS[i]!);
      expect(setEq(rungTargets(rung), expected)).toBe(true);
    });
  });

  test('quantizer TIER_TARGETS is the MotionTier projection of LADDER_TARGETS', () => {
    MOTION_TIER_ORDER.forEach((tier, i) => {
      const expected = new Set<LadderTarget>(LADDER_TARGETS[i]!);
      expect(setEq(TIER_TARGETS[tier], expected)).toBe(true);
    });
  });

  test('the two projections are congruent rung-for-rung (same admitted targets at each ordinal)', () => {
    for (let i = 0; i < LADDER_RUNGS; i++) {
      const capRung = rungTargets(CAP_TIER_ORDER[i]!);
      const motionRung = TIER_TARGETS[MOTION_TIER_ORDER[i]!];
      expect(setEq(capRung, motionRung)).toBe(true);
    }
  });

  test('the ladder is monotone non-strict (each rung is a superset of the one below)', () => {
    // The fixed comment-drift law (G-1): styled == reactive (index 1 == index 2)
    // admit the same targets, so the ladder is a NON-STRICT superset chain.
    for (let i = 1; i < LADDER_RUNGS; i++) {
      const lower = new Set<LadderTarget>(LADDER_TARGETS[i - 1]!);
      const upper = new Set<LadderTarget>(LADDER_TARGETS[i]!);
      expect([...lower].every((t) => upper.has(t))).toBe(true);
    }
    // And it is non-strict somewhere: index 1 and index 2 are equal.
    expect(setEq(new Set(LADDER_TARGETS[1]!), new Set(LADDER_TARGETS[2]!))).toBe(true);
  });

  test('projectLadder rejects a vocabulary with the wrong rung count', () => {
    expect(() => projectLadder(['static', 'styled'])).toThrow(/expects exactly/);
  });
});
