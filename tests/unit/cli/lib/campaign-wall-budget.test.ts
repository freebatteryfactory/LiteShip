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
  campaignShard,
  campaignToolchainDigest,
  makeCoveringTestDigestResolver,
  shardOwnsTarget,
  wallBudgetExhaustedRunner,
  shardForeignRunner,
  CAMPAIGN_WALL_BUDGET_REASON,
  CAMPAIGN_SHARD_FOREIGN_REASON,
} from '../../../../packages/cli/src/internal/repo-ir-gauntlet.js';
import {
  CAMPAIGN_COLD_PROBE_MS,
  CAMPAIGN_POST_STEP_MARGIN_MS,
  CAMPAIGN_TARGET_EVAL_MS,
  scanCampaignWallBudget,
  scanExhaustiveCachePersistence,
  unreadableYamlViolations,
  workflowJobSections,
} from '../../../../packages/cli/src/internal/workflow-action-pins.js';
// Relative endpoint imports, deliberately not the package specifiers: these
// laws are the integration cover for the campaign's two composition edges
// (repo-ir-gauntlet → canonical/index, → core/index), and the composition
// gate's static-reference proxy matches the endpoint PATHS in test text.
import { addressedDigestOf } from '../../../../packages/canonical/src/index.js';
import { systemClock } from '../../../../packages/core/src/index.js';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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
  const CAMPAIGN_JOBS = [
    'exhaustive-mutation',
    'exhaustive-mutation-fold',
    'exhaustive-mcdc',
    'exhaustive-mcdc-fold',
  ] as const;

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
    // A run_id-only save key — attempt 2 of a re-run finds the key reserved
    // by attempt 1, warns, and banks NOTHING (PR #195 review, confirmed).
    const runIdOnlyKey = jobOf(
      `      - uses: actions/cache/restore@${sha} # v4\n      - uses: actions/cache/save@${sha} # v4\n        if: always()\n        with:\n          path: x\n          key: bank-\${{ github.run_id }}\n`,
    );
    expect(
      scanExhaustiveCachePersistence(runIdOnlyKey, ['exhaustive-mutation']).some((v) => v.includes('run_attempt')),
    ).toBe(true);
    // A LONG save step — comments and settings pushing key: past any fixed
    // line window must not smuggle an attempt-less key past the scanner
    // (PR #196 review, confirmed P2: the bounded window failed OPEN).
    const padding = '        # a\n        # b\n        # c\n        # d\n        # e\n        # f\n';
    const longAttemptless = jobOf(
      `      - uses: actions/cache/restore@${sha} # v4\n      - uses: actions/cache/save@${sha} # v4\n        if: always()\n${padding}        with:\n          path: x\n          enableCrossOsArchive: false\n          key: bank-\${{ github.run_id }}\n`,
    );
    expect(
      scanExhaustiveCachePersistence(longAttemptless, ['exhaustive-mutation']).some((v) => v.includes('run_attempt')),
    ).toBe(true);
    // A save step with NO key at all — fail closed, never an unprovable pass.
    const keylessSave = jobOf(
      `      - uses: actions/cache/restore@${sha} # v4\n      - uses: actions/cache/save@${sha} # v4\n        if: always()\n        with:\n          path: x\n`,
    );
    expect(
      scanExhaustiveCachePersistence(keylessSave, ['exhaustive-mutation']).some((v) => v.includes('no with.key')),
    ).toBe(true);
    // A decoy key OUTSIDE with: — an env.key carrying the attempt must not
    // shield an attempt-less cache input; only with.key names the immutable
    // save key (PR #196 review round 2, confirmed P2).
    const envKeyDecoy = jobOf(
      `      - uses: actions/cache/restore@${sha} # v4\n      - uses: actions/cache/save@${sha} # v4\n        if: always()\n        env:\n          key: decoy-\${{ github.run_attempt }}\n        with:\n          path: x\n          key: bank-\${{ github.run_id }}\n`,
    );
    expect(
      scanExhaustiveCachePersistence(envKeyDecoy, ['exhaustive-mutation']).some((v) => v.includes('run_attempt')),
    ).toBe(true);
    // A decoy key INSIDE a block scalar — `path: |` content is nested text,
    // not a with: input; only a DIRECT child key: names the immutable save
    // key (PR #196 review round 3, confirmed P2).
    const pathScalarDecoy = jobOf(
      `      - uses: actions/cache/restore@${sha} # v4\n      - uses: actions/cache/save@${sha} # v4\n        if: always()\n        with:\n          path: |\n            .liteship/cache\n            key: decoy-\${{ github.run_attempt }}\n          key: bank-\${{ github.run_id }}\n`,
    );
    expect(
      scanExhaustiveCachePersistence(pathScalarDecoy, ['exhaustive-mutation']).some((v) => v.includes('run_attempt')),
    ).toBe(true);
    // Restore fallbacks that try a HISTORICAL prefix first — a re-run would
    // resume an older bank instead of this run's own freshly banked work
    // (PR #196 review round 3, confirmed P2).
    const saveOk = `      - uses: actions/cache/save@${sha} # v4\n        if: always()\n        with:\n          path: x\n          key: bank-\${{ github.run_id }}-\${{ github.run_attempt }}\n`;
    const historicalFirstRestore = jobOf(
      `      - uses: actions/cache/restore@${sha} # v4\n        with:\n          path: x\n          key: bank-\${{ github.run_id }}-\${{ github.run_attempt }}\n          restore-keys: |\n            bank-fold-\n            bank-shard0-\${{ github.run_id }}-\n${saveOk}`,
    );
    expect(
      scanExhaustiveCachePersistence(historicalFirstRestore, ['exhaustive-mutation']).some((v) =>
        v.includes('historical'),
      ),
    ).toBe(true);
    // The compliant chain: same-run entries first (broadest bank leading),
    // then each historical fallback AFTER its same-run counterpart.
    const runScopedFirstRestore = jobOf(
      `      - uses: actions/cache/restore@${sha} # v4\n        with:\n          path: x\n          key: bank-\${{ github.run_id }}-\${{ github.run_attempt }}\n          restore-keys: |\n            bank-fold-\${{ github.run_id }}-\n            bank-\${{ github.run_id }}-\n            bank-fold-\n${saveOk}`,
    );
    expect(scanExhaustiveCachePersistence(runScopedFirstRestore, ['exhaustive-mutation'])).toEqual([]);
    // A historical fallback WITHOUT its same-run counterpart earlier — a
    // re-run reaches for an older bank of a namespace whose same-run bank it
    // never tried, resuming stale work (PR #196 review round 12, confirmed
    // P2: attempt 2 picked the partial attempt-1 shard slice over the
    // completed attempt-1 merged fold).
    const historicalWithoutCounterpart = jobOf(
      `      - uses: actions/cache/restore@${sha} # v4\n        with:\n          path: x\n          key: bank-\${{ github.run_id }}-\${{ github.run_attempt }}\n          restore-keys: |\n            bank-\${{ github.run_id }}-\n            bank-fold-\n${saveOk}`,
    );
    expect(
      scanExhaustiveCachePersistence(historicalWithoutCounterpart, ['exhaustive-mutation']).some((v) =>
        v.includes('counterpart'),
      ),
    ).toBe(true);
    // A run-scoped fallback in a FOREIGN namespace — it can never prefix-match
    // this restore's own bank, so a re-run still recovers nothing (PR #196
    // review round 8, confirmed P2).
    const foreignNamespaceFallback = jobOf(
      `      - uses: actions/cache/restore@${sha} # v4\n        with:\n          path: x\n          key: bank-\${{ github.run_id }}-\${{ github.run_attempt }}\n          restore-keys: |\n            unrelated-\${{ github.run_id }}-\n            bank-fold-\n${saveOk}`,
    );
    expect(
      scanExhaustiveCachePersistence(foreignNamespaceFallback, ['exhaustive-mutation']).some((v) =>
        v.includes('namespace'),
      ),
    ).toBe(true);
    // An INLINE comment carrying the attempt — YAML excludes \` #...\` from the
    // effective plain scalar, so the real key stays run-id-only and a re-run
    // still banks nothing (PR #196 review round 4, confirmed P2).
    const commentedAttempt = jobOf(
      `      - uses: actions/cache/restore@${sha} # v4\n      - uses: actions/cache/save@${sha} # v4\n        if: always()\n        with:\n          path: x\n          key: bank-\${{ github.run_id }} # \${{ github.run_attempt }}\n`,
    );
    expect(
      scanExhaustiveCachePersistence(commentedAttempt, ['exhaustive-mutation']).some((v) => v.includes('run_attempt')),
    ).toBe(true);
    // The same trick must not make a historical restore prefix look run-scoped.
    const commentedRunScope = jobOf(
      `      - uses: actions/cache/restore@${sha} # v4\n        with:\n          path: x\n          key: bank-\${{ github.run_id }}-\${{ github.run_attempt }}\n          restore-keys: |\n            bank-fold- # \${{ github.run_id }}\n${saveOk}`,
    );
    expect(
      scanExhaustiveCachePersistence(commentedRunScope, ['exhaustive-mutation']).some((v) => v.includes('historical')),
    ).toBe(true);
    // A NAMED save step — the live ci.yml writes every save as \`- name:\`
    // with uses: on a child line; the key contract must bind by the step's
    // direct-child uses FIELD, not the bullet spelling (PR #196 review
    // round 5, confirmed P2: bullet-only detection skipped every live save).
    const namedAttemptlessSave = jobOf(
      `      - uses: actions/cache/restore@${sha} # v4\n      - name: Save the bank\n        uses: actions/cache/save@${sha} # v4\n        if: always()\n        with:\n          path: x\n          key: bank-\${{ github.run_id }}\n`,
    );
    expect(
      scanExhaustiveCachePersistence(namedAttemptlessSave, ['exhaustive-mutation']).some((v) =>
        v.includes('run_attempt'),
      ),
    ).toBe(true);
    // A restore with NO restore-keys fallback (or an empty one) — the
    // attempt-qualified primary can never exact-match a re-run, so banked
    // work becomes unrecoverable while the contract stays green (PR #196
    // review round 7, confirmed P2).
    const missingFallbackRestore = jobOf(
      `      - uses: actions/cache/restore@${sha} # v4\n        with:\n          path: x\n          key: bank-\${{ github.run_id }}-\${{ github.run_attempt }}\n${saveOk}`,
    );
    expect(
      scanExhaustiveCachePersistence(missingFallbackRestore, ['exhaustive-mutation']).some((v) =>
        v.includes('fallback'),
      ),
    ).toBe(true);
    const emptyFallbackRestore = jobOf(
      `      - uses: actions/cache/restore@${sha} # v4\n        with:\n          path: x\n          key: bank-\${{ github.run_id }}-\${{ github.run_attempt }}\n          restore-keys: |\n${saveOk}`,
    );
    expect(
      scanExhaustiveCachePersistence(emptyFallbackRestore, ['exhaustive-mutation']).some((v) => v.includes('fallback')),
    ).toBe(true);
    // An attempt-ONLY save key — run_attempt restarts at 1 every workflow
    // run, so without github.run_id a later run collides with the first
    // run's immutable key and banks nothing (PR #196 review round 10,
    // confirmed P2).
    const attemptOnlyKey = jobOf(
      `      - uses: actions/cache/restore@${sha} # v4\n        with:\n          path: x\n          key: bank-\${{ github.run_id }}-\${{ github.run_attempt }}\n          restore-keys: |\n            bank-\${{ github.run_id }}-\n      - uses: actions/cache/save@${sha} # v4\n        if: always()\n        with:\n          path: x\n          key: bank-\${{ github.run_attempt }}\n`,
    );
    expect(
      scanExhaustiveCachePersistence(attemptOnlyKey, ['exhaustive-mutation']).some((v) => v.includes('run_id')),
    ).toBe(true);
    // A SAVED namespace no restore recovers — restoring wrong-* while saving
    // bank-* passes every per-step check, yet no re-run ever restores the
    // bank this job saves (PR #196 review round 10, confirmed P2).
    const unrestoredSaveNamespace = jobOf(
      `      - uses: actions/cache/restore@${sha} # v4\n        with:\n          path: x\n          key: wrong-\${{ github.run_id }}-\${{ github.run_attempt }}\n          restore-keys: |\n            wrong-\${{ github.run_id }}-\n${saveOk}`,
    );
    expect(
      scanExhaustiveCachePersistence(unrestoredSaveNamespace, ['exhaustive-mutation']).some((v) =>
        v.includes('never restored'),
      ),
    ).toBe(true);
    // A DECOY always() save shielding a success()-gated bank save — the
    // always() contract binds to EACH save step, not to the job at large
    // (PR #196 review round 13, confirmed P2: the coarse job-wide regex was
    // satisfied by any single always() save).
    const decoyAlwaysSave = jobOf(
      `      - uses: actions/cache/restore@${sha} # v4\n        with:\n          path: x\n          key: bank-\${{ github.run_id }}-\${{ github.run_attempt }}\n          restore-keys: |\n            bank-\${{ github.run_id }}-\n${saveOk}      - uses: actions/cache/save@${sha} # v4\n        if: success()\n        with:\n          path: x\n          key: bank-\${{ github.run_id }}-\${{ github.run_attempt }}\n`,
    );
    expect(
      scanExhaustiveCachePersistence(decoyAlwaysSave, ['exhaustive-mutation']).some((v) => v.includes('always')),
    ).toBe(true);
    // A matching namespace over DIFFERENT paths — actions/cache versions the
    // archive by its path list, so the restore can never recover the save's
    // archive despite the key text matching (PR #196 review round 11,
    // confirmed P2).
    const pathMismatchedPair = jobOf(
      `      - uses: actions/cache/restore@${sha} # v4\n        with:\n          path: x\n          key: bank-\${{ github.run_id }}-\${{ github.run_attempt }}\n          restore-keys: |\n            bank-\${{ github.run_id }}-\n      - uses: actions/cache/save@${sha} # v4\n        if: always()\n        with:\n          path: y\n          key: bank-\${{ github.run_id }}-\${{ github.run_attempt }}\n`,
    );
    expect(
      scanExhaustiveCachePersistence(pathMismatchedPair, ['exhaustive-mutation']).some((v) => v.includes('path')),
    ).toBe(true);
    // The full contract satisfied → clean, even with a long step body.
    const good = jobOf(
      `      - uses: actions/cache/restore@${sha} # v4\n        with:\n          path: x\n          key: bank-\${{ github.run_id }}-\${{ github.run_attempt }}\n          restore-keys: |\n            bank-\${{ github.run_id }}-\n            bank-\n      - uses: actions/cache/save@${sha} # v4\n        if: always()\n${padding}        with:\n          path: x\n          key: bank-\${{ github.run_id }}-\${{ github.run_attempt }}\n`,
    );
    expect(scanExhaustiveCachePersistence(good, ['exhaustive-mutation'])).toEqual([]);
    // A missing job is a violation, never a silent pass.
    expect(scanExhaustiveCachePersistence('\n  other:\n    a: b\n', ['exhaustive-mutation'])).not.toEqual([]);
  });
});

describe('the job boundary is a structural reader, not a lowercase-only regex', () => {
  const sha = 'a'.repeat(40);
  const save = `      - uses: actions/cache/save@${sha}\n        if: always()\n        with:\n          path: x\n          key: bank-\${{ github.run_id }}-\${{ github.run_attempt }}\n`;
  const compliantNext = `      - uses: actions/cache/restore@${sha}\n        with:\n          path: x\n          key: bank-\${{ github.run_id }}-\${{ github.run_attempt }}\n          restore-keys: |\n            bank-\${{ github.run_id }}-\n${save}`;

  it.each(['next_job2', 'NextJob2'])('a job id containing %s bounds the section', (boundary) => {
    const workflow = `jobs:\n  exhaustive-mutation:\n    steps:\n  ${boundary}:\n    steps:\n${compliantNext}`;
    expect(scanExhaustiveCachePersistence(workflow, ['exhaustive-mutation'])).not.toEqual([]);
  });

  it('a trailing comment on a job header still bounds the section', () => {
    const workflow = `jobs:\n  exhaustive-mutation:\n    steps:\n  next-job: # notes\n    steps:\n${compliantNext}`;
    expect(scanExhaustiveCachePersistence(workflow, ['exhaustive-mutation'])).not.toEqual([]);
  });

  it('CRLF input bounds the section identically to LF', () => {
    const workflow = `jobs:\n  exhaustive-mutation:\n    steps:\n  next_job2:\n    steps:\n${compliantNext}`;
    expect(scanExhaustiveCachePersistence(workflow.replaceAll('\n', '\r\n'), ['exhaustive-mutation'])).toEqual(
      scanExhaustiveCachePersistence(workflow, ['exhaustive-mutation']),
    );
  });

  it('a job id that prefixes a later id resolves only its own section', () => {
    const workflow = `jobs:\n  exhaustive-mcdc-fold:\n    steps:\n${compliantNext}  exhaustive-mcdc:\n    steps:\n`;
    const sections = workflowJobSections(workflow);
    expect(sections.get('exhaustive-mcdc')).not.toContain('exhaustive-mcdc-fold');
  });

  it('a campaign job with no cache steps is a violation even when the next job is compliant', () => {
    const workflow = `jobs:\n  exhaustive-mutation:\n    steps:\n  next_job2:\n    steps:\n${compliantNext}`;
    expect(scanExhaustiveCachePersistence(workflow, ['exhaustive-mutation'])).not.toEqual([]);
  });
});

describe('unreadable YAML is a violation, never a skipped line', () => {
  it.each([
    ['flow collection', 'jobs:\n  x:\n    steps:\n      - { uses: actions/checkout@abc }\n'],
    ['alias', 'jobs:\n  x:\n    steps:\n      - *shared\n'],
    ['merge key', 'jobs:\n  x:\n    <<: *defaults\n'],
    ['tab indentation', 'jobs:\n  x:\n\tsteps:\n'],
  ])('%s is refused', (_name, workflow) => {
    expect(unreadableYamlViolations(workflow)).not.toEqual([]);
  });

  it('a duplicate key at one level is refused', () => {
    expect(unreadableYamlViolations('jobs:\n  x:\n    timeout-minutes: 1\n    timeout-minutes: 2\n')).not.toEqual([]);
  });

  it('a bullet field and a child field with the same key are refused', () => {
    expect(
      unreadableYamlViolations(
        'jobs:\n  x:\n    steps:\n      - uses: actions/checkout@abc\n        uses: actions/setup-node@abc\n',
      ),
    ).not.toEqual([]);
  });

  it('the public reader refuses duplicate top-level job ids instead of overwriting one', () => {
    expect(() => workflowJobSections('jobs:\n  x:\n    runs-on: a\n  x:\n    runs-on: b\n')).toThrow(/duplicate/u);
  });
});

describe('campaign wall budgets absorb a cold probe and leave post-step margin (PR #195 review, confirmed)', () => {
  it('the live ci.yml sizes every campaign budget between the cold-probe floor and the backstop ceiling', () => {
    const ci = readFileSync(resolve(import.meta.dirname, '../../../..', '.github', 'workflows', 'ci.yml'), 'utf8');
    expect(
      scanCampaignWallBudget(ci, [
        'exhaustive-mutation',
        'exhaustive-mutation-fold',
        'exhaustive-mcdc',
        'exhaustive-mcdc-fold',
      ]),
    ).toEqual([]);
  });

  it('the scanner REDS every sizing regression class (below floor, above ceiling, missing knobs)', () => {
    const floor = CAMPAIGN_COLD_PROBE_MS + 2 * CAMPAIGN_TARGET_EVAL_MS;
    const jobOf = (timeoutMinutes: number, budgetMs?: number): string =>
      `\n  exhaustive-mutation:\n    timeout-minutes: ${timeoutMinutes}\n    steps:\n      - run: pnpm exec tsx packages/cli/src/bin.ts check gates --ir --mutate\n        env:\n${
        budgetMs === undefined ? '' : `          LITESHIP_CAMPAIGN_WALL_BUDGET_MS: '${budgetMs}'\n`
      }  next-job:\n    a: b\n`;
    // Below the floor: a cold probe eats the whole budget, the census folds
    // inconclusive at index 0, and the run mints nothing to bank.
    expect(
      scanCampaignWallBudget(jobOf(350, floor - 1), ['exhaustive-mutation']).some((v) => v.includes('cold probe')),
    ).toBe(true);
    // Above the ceiling: GitHub's backstop kill lands before the budget fold
    // and skips the always() save post-step. The ceiling reserves the
    // post-step margin PLUS a twice-measured in-flight target, because the
    // budget is only checked at target boundaries (PR #196 review round 6).
    const timeoutMinutes = 100;
    const ceiling = timeoutMinutes * 60_000 - CAMPAIGN_POST_STEP_MARGIN_MS - 2 * CAMPAIGN_TARGET_EVAL_MS;
    expect(
      scanCampaignWallBudget(jobOf(timeoutMinutes, ceiling + 1), ['exhaustive-mutation']).some((v) =>
        v.includes('backstop'),
      ),
    ).toBe(true);
    // A missing budget knob is a violation, never a silent pass.
    expect(scanCampaignWallBudget(jobOf(350), ['exhaustive-mutation'])).not.toEqual([]);
    expect(scanCampaignWallBudget('\n  other:\n    a: b\n', ['exhaustive-mutation'])).not.toEqual([]);
    // COMMENTED-OUT knobs are missing knobs — GitHub applies neither, and the
    // leftover text must not satisfy the contract (PR #196 review round 2,
    // confirmed P2).
    const commentedBudget = `\n  exhaustive-mutation:\n    timeout-minutes: 150\n    steps:\n      - run: pnpm exec tsx packages/cli/src/bin.ts check gates --ir --mutate\n        env:\n          # LITESHIP_CAMPAIGN_WALL_BUDGET_MS: '${floor}'\n  next-job:\n    a: b\n`;
    expect(scanCampaignWallBudget(commentedBudget, ['exhaustive-mutation']).some((v) => v.includes('missing'))).toBe(
      true,
    );
    const commentedTimeout = `\n  exhaustive-mutation:\n    # timeout-minutes: 150\n    steps:\n      - run: pnpm exec tsx packages/cli/src/bin.ts check gates --ir --mutate\n        env:\n          LITESHIP_CAMPAIGN_WALL_BUDGET_MS: '${floor}'\n  next-job:\n    a: b\n`;
    expect(scanCampaignWallBudget(commentedTimeout, ['exhaustive-mutation']).some((v) => v.includes('missing'))).toBe(
      true,
    );
    // A STEP-LEVEL timeout-minutes must not shadow the job-level backstop —
    // GitHub kills the JOB at its own timeout regardless of step budgets
    // (PR #196 review round 3, confirmed P2).
    const stepTimeoutShadow = `\n  exhaustive-mutation:\n    steps:\n      - run: pnpm exec tsx packages/cli/src/bin.ts check gates --ir --mutate\n        timeout-minutes: 150\n        env:\n          LITESHIP_CAMPAIGN_WALL_BUDGET_MS: '${floor}'\n    timeout-minutes: 100\n  next-job:\n    a: b\n`;
    expect(scanCampaignWallBudget(stepTimeoutShadow, ['exhaustive-mutation']).some((v) => v.includes('backstop'))).toBe(
      true,
    );
    // An env on an UNRELATED step never reaches the campaign process
    // (PR #196 review round 3, confirmed P2).
    const unrelatedEnvBudget = `\n  exhaustive-mutation:\n    timeout-minutes: 150\n    steps:\n      - run: echo warmup\n        env:\n          LITESHIP_CAMPAIGN_WALL_BUDGET_MS: '${floor}'\n      - run: pnpm exec tsx packages/cli/src/bin.ts check gates --ir --mutate\n  next-job:\n    a: b\n`;
    expect(scanCampaignWallBudget(unrelatedEnvBudget, ['exhaustive-mutation']).some((v) => v.includes('missing'))).toBe(
      true,
    );
    // Sized inside both bounds → clean.
    expect(scanCampaignWallBudget(jobOf(150, floor), ['exhaustive-mutation'])).toEqual([]);
    // A benign INLINE comment on an active knob is tolerated — stripping
    // comments must not overshoot into false reds (PR #196 review round 4).
    const commentedKnobValue = `\n  exhaustive-mutation:\n    timeout-minutes: 150 # twice-measured\n    steps:\n      - run: pnpm exec tsx packages/cli/src/bin.ts check gates --ir --mutate\n        env:\n          LITESHIP_CAMPAIGN_WALL_BUDGET_MS: '${floor}' # the cold-probe floor\n  next-job:\n    a: b\n`;
    expect(scanCampaignWallBudget(commentedKnobValue, ['exhaustive-mutation'])).toEqual([]);
    // The campaign step is identified by its RUN command — a step merely
    // NAMED after the campaign must not satisfy the contract while the real
    // gates step goes unprotected (PR #196 review round 5, confirmed P2).
    const namedDecoyStep = `\n  exhaustive-mutation:\n    timeout-minutes: 150\n    steps:\n      - name: pretend to check gates\n        run: echo warmup\n        env:\n          LITESHIP_CAMPAIGN_WALL_BUDGET_MS: '${floor}'\n      - name: the real campaign\n        run: |\n          pnpm exec tsx packages/cli/src/bin.ts check gates --ir --mutate\n  next-job:\n    a: b\n`;
    expect(scanCampaignWallBudget(namedDecoyStep, ['exhaustive-mutation']).some((v) => v.includes('missing'))).toBe(
      true,
    );
    // An ECHO decoy — command text mentioning the gates is not an
    // INVOCATION; only a line that starts with the literal gates command
    // qualifies a step as the campaign (PR #196 review round 8, confirmed
    // P2).
    const echoDecoyStep = `\n  exhaustive-mutation:\n    timeout-minutes: 150\n    steps:\n      - run: echo check gates\n        env:\n          LITESHIP_CAMPAIGN_WALL_BUDGET_MS: '${floor}'\n      - run: pnpm exec tsx packages/cli/src/bin.ts check gates --ir --mutate\n  next-job:\n    a: b\n`;
    expect(scanCampaignWallBudget(echoDecoyStep, ['exhaustive-mutation']).some((v) => v.includes('missing'))).toBe(
      true,
    );
    // A LOOK-ALIKE command sharing the invocation's byte prefix — 'check
    // gates-extra' is a different command; the invocation must end at a token
    // boundary (PR #196 review round 12, confirmed P2).
    const prefixDecoyStep = `\n  exhaustive-mutation:\n    timeout-minutes: 150\n    steps:\n      - run: pnpm exec tsx packages/cli/src/bin.ts check gates-extra --mutate\n        env:\n          LITESHIP_CAMPAIGN_WALL_BUDGET_MS: '${floor}'\n      - run: pnpm exec tsx packages/cli/src/bin.ts check gates --ir --mutate\n  next-job:\n    a: b\n`;
    expect(scanCampaignWallBudget(prefixDecoyStep, ['exhaustive-mutation']).some((v) => v.includes('missing'))).toBe(
      true,
    );
    // A budgeted LEAN gates step must not stand in for the exhaustive one —
    // the campaign invocation must carry the job's own mode flag (PR #196
    // review round 9, confirmed P2).
    const leanDecoyStep = `\n  exhaustive-mutation:\n    timeout-minutes: 150\n    steps:\n      - run: pnpm exec tsx packages/cli/src/bin.ts check gates --ir\n        env:\n          LITESHIP_CAMPAIGN_WALL_BUDGET_MS: '${floor}'\n      - run: pnpm exec tsx packages/cli/src/bin.ts check gates --ir --mutate\n  next-job:\n    a: b\n`;
    expect(scanCampaignWallBudget(leanDecoyStep, ['exhaustive-mutation']).some((v) => v.includes('missing'))).toBe(
      true,
    );
    // A sibling block scalar must not leak into the run COMMAND — a bullet
    // \`- run: |\` step ends at its own field indent, so an if: | block
    // mentioning the invocation cannot make a non-campaign step qualify
    // (PR #196 review round 9, confirmed P2).
    const siblingScalarDecoy = `\n  exhaustive-mutation:\n    timeout-minutes: 150\n    steps:\n      - run: |\n          echo hi\n        if: |\n          pnpm exec tsx packages/cli/src/bin.ts check gates --ir --mutate\n        env:\n          LITESHIP_CAMPAIGN_WALL_BUDGET_MS: '${floor}'\n      - run: pnpm exec tsx packages/cli/src/bin.ts check gates --ir --mutate\n  next-job:\n    a: b\n`;
    expect(scanCampaignWallBudget(siblingScalarDecoy, ['exhaustive-mutation']).some((v) => v.includes('missing'))).toBe(
      true,
    );
    // A bullet-inline run: | that genuinely invokes the gates IS the campaign
    // step — the bounded scalar keeps its own content.
    const bulletRunCampaign = `\n  exhaustive-mutation:\n    timeout-minutes: 150\n    steps:\n      - run: |\n          pnpm exec tsx packages/cli/src/bin.ts check gates --ir --mutate\n        env:\n          LITESHIP_CAMPAIGN_WALL_BUDGET_MS: '${floor}'\n  next-job:\n    a: b\n`;
    expect(scanCampaignWallBudget(bulletRunCampaign, ['exhaustive-mutation'])).toEqual([]);
    // And a named campaign step whose run: | block invokes the gates IS the
    // campaign step — its env satisfies the contract.
    const namedCampaignStep = `\n  exhaustive-mutation:\n    timeout-minutes: 150\n    steps:\n      - name: the real campaign\n        env:\n          LITESHIP_CAMPAIGN_WALL_BUDGET_MS: '${floor}'\n        run: |\n          pnpm exec tsx packages/cli/src/bin.ts check gates --ir --mutate\n  next-job:\n    a: b\n`;
    expect(scanCampaignWallBudget(namedCampaignStep, ['exhaustive-mutation'])).toEqual([]);
  });
});

describe('campaignShard — parallel shards partition the census; the fold job re-earns it all from the bank', () => {
  const SHARD_ENV = 'LITESHIP_CAMPAIGN_SHARD';
  const savedShard = process.env[SHARD_ENV];
  afterEach(() => {
    if (savedShard === undefined) delete process.env[SHARD_ENV];
    else process.env[SHARD_ENV] = savedShard;
  });

  it('unset or blank → null (an unsharded run owns every target)', () => {
    delete process.env[SHARD_ENV];
    expect(campaignShard()).toBeNull();
    process.env[SHARD_ENV] = ' ';
    expect(campaignShard()).toBeNull();
  });

  it('parses `i/N` with 0 <= i < N', () => {
    process.env[SHARD_ENV] = '2/6';
    expect(campaignShard()).toEqual({ index: 2, total: 6 });
    process.env[SHARD_ENV] = '0/1';
    expect(campaignShard()).toEqual({ index: 0, total: 1 });
  });

  it('malformed or out-of-range values throw loud — a silent mis-shard would drop census slices', () => {
    for (const bad of ['6/6', '-1/6', '1/0', 'a/6', '1/6/2', '1.5/6', '1']) {
      process.env[SHARD_ENV] = bad;
      expect(() => campaignShard(), `value ${JSON.stringify(bad)} must refuse`).toThrow(/shard/u);
    }
  });

  it('ownership partitions the census exactly: every index owned by exactly one shard', () => {
    const total = 6;
    for (let index = 0; index < 40; index += 1) {
      const owners = Array.from({ length: total }, (_, shard) =>
        shardOwnsTarget(index, { index: shard, total }),
      ).filter(Boolean);
      expect(owners, `target ${index} must have exactly one owner`).toHaveLength(1);
    }
    // A null shard owns everything (the unsharded fold job re-earns the full census).
    expect(shardOwnsTarget(17, null)).toBe(true);
  });

  it('a foreign target folds to inconclusive with the shard reason — never a fabricated verdict, never cached', () => {
    const SRC = 'export function cmp(a: number, b: number): boolean { return a >= b; }';
    const sf = ts.createSourceFile('cmp.ts', SRC, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const mutant = generateMutants(sf, { file: 'cmp.ts' })[0]!;
    const coverage = makeCoverageMap([{ file: 'cmp.ts', line: mutant.line, testId: 'cmp.test' }]);
    const writes: string[] = [];
    const verdict = evaluateMutant(mutant, {
      runner: shardForeignRunner,
      coverage,
      originalSource: SRC,
      cache: { read: () => null, write: (key: string) => void writes.push(key) },
      toolchainDigest: 'tc-sha256:shard-law',
    });
    expect(verdict._tag).toBe('inconclusive');
    expect(verdict._tag === 'inconclusive' ? verdict.reason : '').toContain(CAMPAIGN_SHARD_FOREIGN_REASON);
    expect(writes).toEqual([]);
  });
});

describe('makeCoveringTestDigestResolver — the campaign↔canonical composition edge', () => {
  // These laws exercise the two composition edges the wall-budget work opened
  // (run 30606178745's exhaustive-analysis blocked on them, correctly — new
  // edges never enroll in the shrink-only baseline): the resolver routes
  // through @liteship/canonical's addressedDigestOf, and the budget clock
  // through @liteship/core's systemClock entropy boundary.
  it('digests a covering test byte-for-byte through the SAME canonical kernel, memoized', () => {
    const root = mkdtempSync(join(tmpdir(), 'liteship-covdigest-'));
    try {
      const bytes = 'export const law = 1;\n';
      writeFileSync(join(root, 'covered.test.ts'), bytes, 'utf8');
      const resolver = makeCoveringTestDigestResolver(root);
      const expected = addressedDigestOf(Buffer.from(bytes, 'utf8'), 'blake3').integrity_digest;
      expect(resolver('covered.test.ts')).toBe(expected);
      // Memoized: the same id re-resolves to the identical digest even after
      // the bytes change on disk mid-run (a campaign reads each test once).
      writeFileSync(join(root, 'covered.test.ts'), 'export const law = 2;\n', 'utf8');
      expect(resolver('covered.test.ts')).toBe(expected);
      // An unreadable id gets the fail-closed absence marker — distinct from
      // any real content digest, so the verdict re-earns instead of colliding.
      expect(resolver('never-existed.test.ts')).toBe('absent:never-existed.test.ts');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('the budget clock reads the declared entropy boundary (elapsed, monotonic-safe)', () => {
    // The wall budget compares systemClock.now() deltas — the same boundary
    // the campaign anchors BEFORE the probe phase (run 30606178745: a
    // loop-anchored clock let an 85-minute cold probe phase push expiry past
    // the job backstop).
    const a = systemClock.now();
    const b = systemClock.now();
    expect(typeof a).toBe('number');
    expect(b).toBeGreaterThanOrEqual(a);
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
