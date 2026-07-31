/**
 * The campaign WALL-BUDGET laws (run 30579292227: both exhaustive campaigns
 * were KILLED at GitHub's 6h job ceiling — 893 mutants + 8,420 MC/DC pins,
 * one vitest boot each, cannot finish in one job — and the kill skips post
 * steps, so a persisted verdict cache would never save and no progress could
 * ever bank). The budget's contract:
 *
 *  - once elapsed wall time crosses the budget, the campaign STOPS MINTING
 *    verdicts: remaining targets fold to `inconclusive` with the resume
 *    reason — never a crash, never a fabricated verdict, never a cache write
 *    (an inconclusive is uncacheable by the existing law), so the receipts
 *    fail HONESTLY and the process exits normally, banking the cache;
 *  - the env knob is fail-closed: a malformed value throws loud rather than
 *    silently running unbudgeted.
 *
 * @module
 */
import { describe, it, expect, afterEach } from 'vitest';
import { evaluateMutant, makeCoverageMap, generateMutants } from '@liteship/audit';
import ts from 'typescript';
import {
  campaignWallBudgetMs,
  campaignToolchainDigest,
  wallBudgetExhaustedRunner,
  CAMPAIGN_WALL_BUDGET_REASON,
} from '../../../../packages/cli/src/internal/repo-ir-gauntlet.js';

const ENV_KEY = 'LITESHIP_CAMPAIGN_WALL_BUDGET_MS';
const savedEnv = process.env[ENV_KEY];
afterEach(() => {
  if (savedEnv === undefined) delete process.env[ENV_KEY];
  else process.env[ENV_KEY] = savedEnv;
});

describe('campaignWallBudgetMs — the fail-closed env knob', () => {
  it('unset or blank → null (unbudgeted local runs keep full authority)', () => {
    delete process.env[ENV_KEY];
    expect(campaignWallBudgetMs()).toBeNull();
    process.env[ENV_KEY] = '  ';
    expect(campaignWallBudgetMs()).toBeNull();
  });

  it('a positive integer of milliseconds parses', () => {
    process.env[ENV_KEY] = '16200000';
    expect(campaignWallBudgetMs()).toBe(16_200_000);
  });

  it('malformed values throw loud — never a silent unbudgeted run', () => {
    for (const bad of ['4.5h', '-1', '0', '1e3 ', 'NaN']) {
      process.env[ENV_KEY] = bad;
      expect(() => campaignWallBudgetMs(), `value ${JSON.stringify(bad)} must refuse`).toThrow(/positive integer/u);
    }
  });
});

describe('campaignToolchainDigest — the verdict bank stays armed under --no-cache', () => {
  it('mints a mode-namespaced digest with no gate-fold cache in sight', () => {
    // Under --no-cache the gate-FOLD cache is disarmed (resolveVerdictCache
    // returns {}), which used to starve the campaign of a toolchain digest and
    // silently disable per-mutant verdict banking — the convergence keystone
    // for a census that exceeds any single job (run 30579292227).
    const mutate = campaignToolchainDigest(process.cwd(), { noCache: true, withMutate: true });
    const mcdc = campaignToolchainDigest(process.cwd(), { noCache: true, withMcdc: true });
    expect(mutate).toMatch(/^tc-sha256:/u);
    expect(mcdc).toMatch(/^tc-sha256:/u);
    // The MODE namespaces the digest — a condition-pin verdict minted under
    // MC/DC must never serve the operator-mutation mode or vice versa.
    expect(mutate).not.toBe(mcdc);
  });
});

describe('wallBudgetExhaustedRunner — exhaustion folds to inconclusive, never a verdict or a crash', () => {
  const SRC = 'export function cmp(a: number, b: number): boolean { return a >= b; }';

  it('evaluateMutant folds the refusal to `inconclusive` carrying the resume reason, and never caches it', () => {
    const sf = ts.createSourceFile('cmp.ts', SRC, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const mutant = generateMutants(sf, { file: 'cmp.ts' })[0]!;
    const coverage = makeCoverageMap([{ file: 'cmp.ts', line: mutant.line, testId: 'cmp.test' }]);
    const writes: string[] = [];
    const verdict = evaluateMutant(mutant, {
      runner: wallBudgetExhaustedRunner,
      coverage,
      originalSource: SRC,
      cache: {
        read: () => null,
        write: (key: string) => {
          writes.push(key);
        },
      },
      toolchainDigest: 'tc-sha256:wall-budget-law',
    });
    expect(verdict._tag).toBe('inconclusive');
    expect(verdict._tag === 'inconclusive' ? verdict.reason : '').toContain(CAMPAIGN_WALL_BUDGET_REASON);
    // NEVER cached: a budget refusal is not a verdict — the next run must re-evaluate.
    expect(writes).toEqual([]);
  });
});
