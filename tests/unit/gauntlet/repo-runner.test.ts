/**
 * The wired repo runner — `litelaunchGauntlet` over the REAL `packages/&#42;/src`,
 * with the committed assurance map and the committed `LITESHIP_WAIVERS` applied.
 *
 * This is the proof the waivers have TEETH ON THE ACTUAL REPO (not just on a
 * fixture): the entropy-boundary waivers in `waivers.ts` are evaluated against the
 * real findings the gates surface, scoped per-gate by ruleId. The two load-bearing
 * assertions:
 *
 *  1. With `now` BEFORE the boundary-review date, the three substrate-boundary
 *     no-nondeterminism findings (clock×2 + rng) and the four declared-benign
 *     no-silent-catch findings are WAIVED — suppressed, not kept — and NO waiver
 *     goes stale (every committed waiver matches a real finding in scope).
 *
 *  2. With `now` AFTER the boundary-review date, those SAME waivers EXPIRE: each
 *     re-reds (its underlying finding returns to `kept`) AND adds a blocking
 *     `gauntlet/waiver-expired` error. The run blocks. This is the recurring-audit
 *     mechanism firing — a waiver that is never re-confirmed dies, on the real repo.
 *
 * The clock is INJECTED (never `Date.now()`), so both verdicts are deterministic.
 */

import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { scaledTimeout } from '../../../vitest.shared.js';
import {
  litelaunchGauntlet,
  runGauntletOnRepo,
  LITESHIP_GATES,
  LITESHIP_WAIVERS,
  LITESHIP_ASSURANCE_MAP,
  ALWAYS_BLOCKING_RULES,
  noSkippedTestGate,
  noPlaceholderGate,
  noEarlyReturnTestGate,
  type Waiver,
} from '@czap/gauntlet';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..', '..');

// The committed boundary-review expiry is 2027-06-20 (see waivers.ts). Pick a
// `now` comfortably before and after it — injected, so the verdict is reproducible.
const BEFORE_REVIEW = new Date('2026-06-20');
const AFTER_REVIEW = new Date('2028-01-01');

/** All committed waivers, by ruleId — the set each gate evaluates its scope against. */
const WAIVED_RULE_IDS = new Set(LITESHIP_WAIVERS.map((w) => w.ruleId));

describe('litelaunchGauntlet — the committed waivers govern the REAL repo', () => {
  it('exposes its inputs as live, non-empty surface (no dead convenience function)', () => {
    // The runner binds REAL gates, a REAL map, and a REAL waiver list — none empty.
    expect(LITESHIP_GATES.length).toBeGreaterThanOrEqual(6);
    expect(LITESHIP_WAIVERS.length).toBeGreaterThan(0);
    expect(LITESHIP_ASSURANCE_MAP.length).toBeGreaterThan(0);
  });

  it('BEFORE the review date: every committed waiver suppresses a REAL finding (teeth, no stale)', () => {
    const result = litelaunchGauntlet(REPO_ROOT, BEFORE_REVIEW);

    // Each gate whose rule has a committed waiver must show that waiver WORKING:
    // ≥1 finding waived, and ZERO waiver-findings (no stale/expired/forbidden noise).
    for (const ruleId of WAIVED_RULE_IDS) {
      const outcome = result.outcomes.find((o) => o.gateId === ruleId);
      expect(outcome, `gate ${ruleId} must run`).toBeDefined();
      expect(
        outcome!.waived.length,
        `gate ${ruleId}: at least one committed waiver must suppress a REAL finding on the repo`,
      ).toBeGreaterThan(0);
      expect(
        outcome!.waiverFindings,
        `gate ${ruleId}: a committed waiver must NOT go stale/expired before the review date`,
      ).toEqual([]);
    }

    // The whole waiver count is accounted for: total waived findings ≥ waiver count
    // (each committed waiver matched at least one finding).
    const totalWaived = result.outcomes.reduce((n, o) => n + o.waived.length, 0);
    expect(totalWaived).toBeGreaterThanOrEqual(LITESHIP_WAIVERS.length);

    // No committed waiver is stale/expired/forbidden anywhere in the run.
    const waiverFindings = result.outcomes.flatMap((o) => o.waiverFindings);
    expect(waiverFindings).toEqual([]);
    // litelaunchGauntlet scans the whole repo (one ts.Program build) — generous,
    // CI-scaled headroom so a slow runner is never read as a failure (raw numeric
    // literals are rejected by the timeout policy; scaledTimeout is the seam).
  }, scaledTimeout(60000));

  it('AFTER the review date: the SAME waivers EXPIRE — re-red + block (the recurring audit fires)', () => {
    const before = litelaunchGauntlet(REPO_ROOT, BEFORE_REVIEW);
    const after = litelaunchGauntlet(REPO_ROOT, AFTER_REVIEW);

    // Every committed waiver expired → one waiver-expired error each, and nothing
    // is waived any more (the suppression lapsed).
    const expiredFindings = after.outcomes.flatMap((o) =>
      o.waiverFindings.filter((f) => f.ruleId === 'gauntlet/waiver-expired'),
    );
    expect(expiredFindings.length).toBe(LITESHIP_WAIVERS.length);
    for (const f of expiredFindings) expect(f.severity).toBe('error');

    const totalWaivedAfter = after.outcomes.reduce((n, o) => n + o.waived.length, 0);
    expect(totalWaivedAfter, 'an expired waiver suppresses nothing').toBe(0);

    // The findings the waivers HAD covered are now kept again (the debt is live).
    // Count the boundary findings that moved from `waived` (before) to `findings`
    // (after) for each waived rule.
    for (const ruleId of WAIVED_RULE_IDS) {
      const b = before.outcomes.find((o) => o.gateId === ruleId)!;
      const a = after.outcomes.find((o) => o.gateId === ruleId)!;
      const reReddened = a.findings.filter((f) => f.ruleId === ruleId);
      expect(reReddened.length, `${ruleId}: expired waiver re-reds its finding`).toBe(b.waived.length);
    }

    // An expired waiver blocks unconditionally (waiver teeth, regardless of the
    // gate's earned authority).
    expect(after.blocked).toBe(true);
    // Two full-repo scans (before + after) — the slow-runner timeout that bit windows.
  }, scaledTimeout(60000));

  it('is deterministic — same repo + same injected now → identical blocking verdict', () => {
    const a = litelaunchGauntlet(REPO_ROOT, BEFORE_REVIEW);
    const b = litelaunchGauntlet(REPO_ROOT, BEFORE_REVIEW);
    expect(a.blocked).toBe(b.blocked);
    expect(a.outcomes.map((o) => [o.gateId, o.findings.length, o.waived.length])).toEqual(
      b.outcomes.map((o) => [o.gateId, o.findings.length, o.waived.length]),
    );
    // Two full-repo scans (a + b) for the determinism check — same scaled headroom.
  }, scaledTimeout(60000));
});

describe('the always-blocking rules are emitted by REAL gates (the forbidden floor is not inert)', () => {
  it('ALWAYS_BLOCKING_RULES exactly matches the ids the always-blocking gates emit', () => {
    // Source of truth: the gate ids themselves — never a hardcoded duplicate list.
    expect([...ALWAYS_BLOCKING_RULES].sort()).toEqual(
      [noPlaceholderGate.id, noSkippedTestGate.id, noEarlyReturnTestGate.id].sort(),
    );
  });

  it('both always-blocking gates are part of the wired repo run', () => {
    const ids = LITESHIP_GATES.map((g) => g.id);
    expect(ids).toContain(noSkippedTestGate.id);
    expect(ids).toContain(noPlaceholderGate.id);
  });

  it('a sneaky waiver targeting an always-blocking rule is VOID + blocks (you cannot waive a lie)', () => {
    // A waiver targeting the no-skipped-test rule, applied through the SAME runner
    // path. The forbidden floor must surface it as void (error) AND block — even
    // when it matches no current finding, a forbidden waiver can never be silent.
    const sneaky: Waiver = {
      ruleId: noSkippedTestGate.id,
      owner: 'sneaky@x',
      reason: 'trying to waive a skip',
      expires: '2999-01-01',
      blastRadius: 'none',
      debtScore: 0,
    };
    const result = runGauntletOnRepo(
      [noSkippedTestGate],
      { repoRoot: REPO_ROOT, globs: ['packages/*/src/**/*.ts'] },
      { waivers: [sneaky], now: BEFORE_REVIEW },
    );
    const forbidden = result.outcomes
      .flatMap((o) => o.waiverFindings)
      .filter((f) => f.ruleId === 'gauntlet/waiver-forbidden');
    expect(forbidden.length, 'a waiver targeting an always-blocking rule is VOID').toBe(1);
    expect(result.blocked, 'a forbidden waiver blocks the run').toBe(true);
  });
});
