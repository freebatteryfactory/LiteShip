/**
 * Slice B (B1, step 3) — the gate-set wiring proof: the IR-fold gates run ONLY on
 * the IR-present host composition; the lean default is unaffected.
 *
 * - `LITESHIP_GATES` (the lean default the MCP/command path runs) does NOT contain
 *   the IR-fold gates — so the lean path never tries to run a gate that requires an
 *   IR it does not have.
 * - `LITESHIP_IR_GATES` (the host composition) re-expresses no-bare-throw as the
 *   IR fold AND adds the divergence gate, with NO duplicate ruleid double-counting.
 * - `litelaunchGauntletWithIR` runs the IR-fold gates over an injected IR.
 * - `litelaunchGauntlet` with NO ir runs the seven regex gates and never throws on
 *   the absent IR (the lean path is unaffected).
 *
 * @module
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import {
  LITESHIP_GATES,
  LITESHIP_IR_GATES,
  litelaunchGauntlet,
  litelaunchGauntletWithIR,
  makeRepoIR,
  type RepoIR,
} from '@czap/gauntlet';

const REPO_ROOT = resolve(import.meta.dirname, '..', '..', '..');

/** The IR-fold gate ids that REQUIRE an injected IR (must not be in the lean set). */
const IR_FOLD_GATE_IDS = ['gauntlet/no-default-export-divergence'] as const;

function ids(gates: readonly { id: string }[]): readonly string[] {
  return gates.map((g) => g.id);
}

describe('the lean LITESHIP_GATES default is IR-free', () => {
  it('does NOT contain the oracle-divergence gate (it requires the IR)', () => {
    for (const id of IR_FOLD_GATE_IDS) {
      expect(ids(LITESHIP_GATES)).not.toContain(id);
    }
  });

  it('has exactly the seven regex gates', () => {
    expect(ids(LITESHIP_GATES)).toEqual([
      'gauntlet/no-bare-throw',
      'gauntlet/no-ts-ignore',
      'gauntlet/no-nondeterminism',
      'gauntlet/no-silent-catch',
      'gauntlet/no-skipped-test',
      'gauntlet/no-placeholder',
      'gauntlet/no-early-return-test',
    ]);
  });
});

describe('the host LITESHIP_IR_GATES composition', () => {
  it('adds the divergence gate AND re-expresses no-bare-throw (no duplicate ruleid)', () => {
    const got = ids(LITESHIP_IR_GATES);
    // The divergence gate is present.
    expect(got).toContain('gauntlet/no-default-export-divergence');
    // The avionics-tier performance-contracts gate (Slice C) ships in the IR-host
    // set — a LEAN fold over committed benchmarks/, NOT requireIR, but composed here
    // alongside the other Slice B/C gates (never in the lean LITESHIP_GATES cut).
    expect(got).toContain('gauntlet/performance-contracts');
    // no-bare-throw appears exactly once (the IR fold REPLACES the regex one — no
    // double-count of the same rule).
    expect(got.filter((id) => id === 'gauntlet/no-bare-throw')).toHaveLength(1);
    // No id appears twice.
    expect(new Set(got).size).toBe(got.length);
  });
});

/** A one-file IR with a genuine bare-throw fact + a divergence (regex-only). */
function ir(): RepoIR {
  const file = 'packages/x/src/a.ts';
  return makeRepoIR({
    files: [{ id: file, contentDigest: 'placeholder:no-content-address', packageName: null }],
    facts: [
      { file, line: 2, property: 'bare-throw', value: true, oracleId: 'ts-ast', coverageClass: 'file-proxy-only' },
      // regex-only is-default-export → a divergence the gate must report.
      { file, line: 9, property: 'is-default-export', value: true, oracleId: 'invariant-regex', coverageClass: 'text-only' },
    ],
  });
}

describe('litelaunchGauntletWithIR runs the IR-fold gates over the injected IR', () => {
  it('the IR-fold no-bare-throw and the divergence gate both produce outcomes', () => {
    // Empty globs → no real files scanned; the IR-fold gates fold the injected IR.
    const result = litelaunchGauntletWithIR(REPO_ROOT, new Date(0), ir(), []);
    const outcomeIds = result.outcomes.map((o) => o.gateId);
    expect(outcomeIds).toContain('gauntlet/no-bare-throw');
    expect(outcomeIds).toContain('gauntlet/no-default-export-divergence');

    // The divergence gate fired on the regex-only fact (advisory cross-class).
    const div = result.findings.filter((f) => f.ruleId === 'gauntlet/no-default-export-divergence');
    expect(div).toHaveLength(1);
    expect(div[0]?.severity).toBe('advisory');

    // The IR-fold no-bare-throw fired on the bare-throw fact.
    const bt = result.findings.filter((f) => f.ruleId === 'gauntlet/no-bare-throw');
    expect(bt).toHaveLength(1);
    expect(bt[0]?.location?.line).toBe(2);
  });
});

describe('the lean path is unaffected — litelaunchGauntlet with NO ir', () => {
  it('runs the seven regex gates IR-free and never throws on the absent IR', () => {
    const result = litelaunchGauntlet(REPO_ROOT, new Date(0), ['packages/gauntlet/src/**/*.ts']);
    const outcomeIds = result.outcomes.map((o) => o.gateId);
    // The seven lean gates ran...
    expect(outcomeIds).toContain('gauntlet/no-bare-throw');
    // ...and the IR-requiring divergence gate did NOT (it is not in the lean set).
    expect(outcomeIds).not.toContain('gauntlet/no-default-export-divergence');
  });
});
