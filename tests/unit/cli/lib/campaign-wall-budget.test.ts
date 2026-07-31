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
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { evaluateMutant, makeCoverageMap, generateMutants, mutantVerdictKey } from '@liteship/audit';
import ts from 'typescript';
import {
  campaignWallBudgetMs,
  campaignToolchainDigest,
  wallBudgetExhaustedRunner,
  CAMPAIGN_WALL_BUDGET_REASON,
} from '../../../../packages/cli/src/internal/repo-ir-gauntlet.js';
import { scanExhaustiveCachePersistence } from '../../../../packages/cli/src/internal/workflow-action-pins.js';

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

describe('the verdict key folds covering-test CONTENT (PR #194 review, confirmed P1)', () => {
  // The stale-authority hole: a nightly that weakens an assertion in an
  // existing covering test changes neither the mutated source, the test's
  // PATH, nor the toolchain build — so the persisted bank would keep serving
  // the old `killed` tag and the weakened test retains authority it no longer
  // earns. Folding each covering test's content digest into the key flips it
  // (→ MISS → re-run) on any covering-test edit, and ONLY for the mutants
  // that test covers (convergence stays incremental).
  const SRC = 'export function cmp(a: number, b: number): boolean { return a >= b; }';
  const sf = () => ts.createSourceFile('cmp.ts', SRC, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

  it('a covering-test content change flips the key; an unrelated digest does not', () => {
    const mutant = generateMutants(sf(), { file: 'cmp.ts' })[0]!;
    const before = mutantVerdictKey(mutant, ['a.test.ts', 'b.test.ts'], 'tc-sha256:x', (id) =>
      id === 'a.test.ts' ? 'blake3:aaa' : 'blake3:bbb',
    );
    const after = mutantVerdictKey(mutant, ['a.test.ts', 'b.test.ts'], 'tc-sha256:x', (id) =>
      id === 'a.test.ts' ? 'blake3:EDITED' : 'blake3:bbb',
    );
    expect(after).not.toBe(before);
    // Deterministic: the same digests re-mint the same key.
    const again = mutantVerdictKey(mutant, ['b.test.ts', 'a.test.ts'], 'tc-sha256:x', (id) =>
      id === 'a.test.ts' ? 'blake3:aaa' : 'blake3:bbb',
    );
    expect(again).toBe(before);
  });

  it('a cached verdict is NOT served across a covering-test content change (end to end)', () => {
    const mutant = generateMutants(sf(), { file: 'cmp.ts' })[0]!;
    const coverage = makeCoverageMap([{ file: 'cmp.ts', line: mutant.line, testId: 'cmp.test.ts' }]);
    const store = new Map<string, 'killed' | 'survived'>();
    const cache = {
      read: (key: string) => store.get(key) ?? null,
      write: (key: string, tag: string) => void store.set(key, tag as 'killed' | 'survived'),
    };
    let runs = 0;
    const runner = () => {
      runs += 1;
      return { failed: true };
    };
    let testDigest = 'blake3:original-test-bytes';
    const options = {
      runner,
      coverage,
      originalSource: SRC,
      cache,
      toolchainDigest: 'tc-sha256:key-law',
      coveringTestDigest: () => testDigest,
    };
    expect(evaluateMutant(mutant, options)._tag).toBe('killed');
    expect(runs).toBe(1);
    // Same content → HIT, no re-run.
    expect(evaluateMutant(mutant, options)._tag).toBe('killed');
    expect(runs).toBe(1);
    // The covering test's CONTENT changes → MISS → the runner re-earns the verdict.
    testDigest = 'blake3:weakened-test-bytes';
    expect(evaluateMutant(mutant, options)._tag).toBe('killed');
    expect(runs).toBe(2);
  });
});

describe('the exhaustive lanes SAVE the verdict bank even when gates exit red (PR #194 review, confirmed P1)', () => {
  const CAMPAIGN_JOBS = ['exhaustive-mutation', 'exhaustive-mcdc'] as const;

  it('the live ci.yml satisfies the cache-persistence contract in both campaign jobs', () => {
    const ci = readFileSync(resolve(import.meta.dirname, '../../../..', '.github', 'workflows', 'ci.yml'), 'utf8');
    expect(scanExhaustiveCachePersistence(ci, CAMPAIGN_JOBS)).toEqual([]);
  });

  it('the scanner REDS every regression class (combined action, missing save, conditional save)', () => {
    const sha = 'a'.repeat(40);
    const jobOf = (steps: string): string => `\n  exhaustive-mutation:\n    steps:\n${steps}\n  next-job:\n    a: b\n`;
    // The combined action — its post-if: success() save skips red runs.
    const combined = jobOf(`      - uses: actions/cache@${sha} # v4\n`);
    expect(scanExhaustiveCachePersistence(combined, ['exhaustive-mutation'])).not.toEqual([]);
    // Restore without a save — nothing ever banks.
    const restoreOnly = jobOf(`      - uses: actions/cache/restore@${sha} # v4\n`);
    expect(scanExhaustiveCachePersistence(restoreOnly, ['exhaustive-mutation']).some((v) => v.includes('save'))).toBe(
      true,
    );
    // A save WITHOUT always() — still skips red runs.
    const conditionalSave = jobOf(
      `      - uses: actions/cache/restore@${sha} # v4\n      - uses: actions/cache/save@${sha} # v4\n        with:\n          path: x\n`,
    );
    expect(
      scanExhaustiveCachePersistence(conditionalSave, ['exhaustive-mutation']).some((v) => v.includes('always')),
    ).toBe(true);
    // The full contract satisfied → clean.
    const good = jobOf(
      `      - uses: actions/cache/restore@${sha} # v4\n      - uses: actions/cache/save@${sha} # v4\n        if: always()\n`,
    );
    expect(scanExhaustiveCachePersistence(good, ['exhaustive-mutation'])).toEqual([]);
    // A missing job is a violation, never a silent pass.
    expect(scanExhaustiveCachePersistence('\n  other:\n    a: b\n', ['exhaustive-mutation'])).not.toEqual([]);
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
