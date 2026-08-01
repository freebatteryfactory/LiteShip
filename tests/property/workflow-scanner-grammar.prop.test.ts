/**
 * Generative grammar law for the workflow scanners.
 *
 * Ground truth comes from construction: a semantic spec determines whether
 * the cache and wall-budget contracts are satisfied, while an orthogonal
 * spelling vector changes only YAML presentation. No second YAML reader or
 * differential oracle decides the expected verdict.
 *
 * TEETH (do not delete): with the exact map lookup temporarily replaced by
 * the legacy lowercase-only grammar's lost-boundary selection, seed
 * 0x5ca9be11 reds immediately at
 * { campaignStepInvokes: false, idAlphabet: 'mixed-alnum-underscore',
 *   eol: 'LF', trailingComment: false }; the compliant Next_job2 section is
 * mistaken for exhaustive-mutation and the missing campaign/cache subjects
 * pass. The dedicated boundary arm shrinks to { eol: 'LF',
 * trailingComment: false } at seed 0x5ca9be15.
 *
 * @module
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  CAMPAIGN_COLD_PROBE_MS,
  CAMPAIGN_TARGET_EVAL_MS,
  scanCampaignWallBudget,
  scanExhaustiveCachePersistence,
  workflowJobSections,
} from '../../packages/cli/src/internal/workflow-action-pins.js';

interface SemanticSpec {
  readonly savesAlways: boolean;
  readonly keyHasAttempt: boolean;
  readonly keyHasRunId: boolean;
  readonly restoreKeysPresent: boolean;
  readonly firstFallbackRunScoped: boolean;
  readonly firstFallbackNamespaceBound: boolean;
  readonly pathsMatch: boolean;
  readonly budgetPresent: boolean;
  readonly budgetInBounds: boolean;
  readonly timeoutAtJobLevel: boolean;
  readonly campaignStepInvokes: boolean;
  readonly campaignStepHasModeFlag: boolean;
  readonly combinedCacheActionPresent: boolean;
}

interface Spelling {
  readonly bullet: 'uses-bullet' | 'name-bullet-with-child';
  readonly quoting: 'bare' | 'single' | 'double';
  readonly expressionSpacing: 'tight' | 'loose';
  readonly commentPlacement: 'none' | 'after-key' | 'after-value' | 'full-line' | 'commented-twin';
  readonly blockScalarDecoy: 'none' | 'path-contains-key' | 'if-contains-invocation';
  readonly conditionSpelling: 'plain' | 'expression';
  readonly eol: 'LF' | 'CRLF';
  readonly idAlphabet: 'lower-hyphen' | 'mixed-alnum-underscore';
  readonly trailingComment: boolean;
  readonly restoreKeysForm: 'block' | 'block-list' | 'inline';
}

const SPEC = fc.record<SemanticSpec>({
  savesAlways: fc.boolean(),
  keyHasAttempt: fc.boolean(),
  keyHasRunId: fc.boolean(),
  restoreKeysPresent: fc.boolean(),
  firstFallbackRunScoped: fc.boolean(),
  firstFallbackNamespaceBound: fc.boolean(),
  pathsMatch: fc.boolean(),
  budgetPresent: fc.boolean(),
  budgetInBounds: fc.boolean(),
  timeoutAtJobLevel: fc.boolean(),
  campaignStepInvokes: fc.boolean(),
  campaignStepHasModeFlag: fc.boolean(),
  combinedCacheActionPresent: fc.boolean(),
});

const SPELLING = fc.record<Spelling>({
  bullet: fc.constantFrom('uses-bullet', 'name-bullet-with-child'),
  quoting: fc.constantFrom('bare', 'single', 'double'),
  expressionSpacing: fc.constantFrom('tight', 'loose'),
  commentPlacement: fc.constantFrom('none', 'after-key', 'after-value', 'full-line', 'commented-twin'),
  blockScalarDecoy: fc.constantFrom('none', 'path-contains-key', 'if-contains-invocation'),
  conditionSpelling: fc.constantFrom('plain', 'expression'),
  eol: fc.constantFrom('LF', 'CRLF'),
  idAlphabet: fc.constantFrom('lower-hyphen', 'mixed-alnum-underscore'),
  trailingComment: fc.boolean(),
  restoreKeysForm: fc.constantFrom('block', 'block-list', 'inline'),
});

const SHA = 'a'.repeat(40);
const TARGET_JOB = 'exhaustive-mutation';
const FLOOR = CAMPAIGN_COLD_PROBE_MS + 2 * CAMPAIGN_TARGET_EVAL_MS;
const COMPLIANT_SPEC: SemanticSpec = {
  savesAlways: true,
  keyHasAttempt: true,
  keyHasRunId: true,
  restoreKeysPresent: true,
  firstFallbackRunScoped: true,
  firstFallbackNamespaceBound: true,
  pathsMatch: true,
  budgetPresent: true,
  budgetInBounds: true,
  timeoutAtJobLevel: true,
  campaignStepInvokes: true,
  campaignStepHasModeFlag: true,
  combinedCacheActionPresent: false,
};

function expression(name: 'github.run_id' | 'github.run_attempt', spelling: Spelling): string {
  return spelling.expressionSpacing === 'tight' ? `\${{ ${name} }}` : `\${{  ${name}  }}`;
}

function quoted(value: number, spelling: Spelling): string {
  if (spelling.quoting === 'single') return `'${value}'`;
  if (spelling.quoting === 'double') return `"${value}"`;
  return String(value);
}

function usesStep(name: string, action: string, body: string, spelling: Spelling): string {
  const head =
    spelling.bullet === 'uses-bullet'
      ? `      - uses: ${action}\n`
      : `      - name: ${name}\n        uses: ${action}\n`;
  return `${head}${body}`;
}

function scalarComment(spelling: Spelling): string {
  return spelling.commentPlacement === 'after-value' ? ' # inert trailing comment' : '';
}

function fullLineComment(indent: string, spelling: Spelling): string {
  return spelling.commentPlacement === 'full-line' ? `${indent}# inert full-line comment\n` : '';
}

function mappingKeyComment(spelling: Spelling): string {
  return spelling.commentPlacement === 'after-key' ? ' # inert mapping-key comment' : '';
}

function alwaysCondition(spelling: Spelling): string {
  return spelling.conditionSpelling === 'plain'
    ? 'always()'
    : spelling.expressionSpacing === 'tight'
      ? '${{ always() }}'
      : '${{  always()  }}';
}

function pathField(value: string, spelling: Spelling): string {
  return spelling.blockScalarDecoy === 'path-contains-key'
    ? `          path: |\n            ${value}\n            key: decoy-inside-path\n`
    : `          path: ${value}\n`;
}

function cacheSteps(spec: SemanticSpec, spelling: Spelling): string {
  const runId = expression('github.run_id', spelling);
  const attempt = expression('github.run_attempt', spelling);
  const key = `bank-${spec.keyHasRunId ? `${runId}-` : ''}${spec.keyHasAttempt ? attempt : 'fixed'}`;
  const fallbackNamespace = spec.firstFallbackNamespaceBound ? 'bank-' : 'other-';
  const fallback = `${fallbackNamespace}${spec.firstFallbackRunScoped ? `${runId}-` : ''}`;
  const restoreKeys = !spec.restoreKeysPresent
    ? ''
    : spelling.restoreKeysForm === 'inline'
      ? `          restore-keys: ${fallback}\n`
      : spelling.restoreKeysForm === 'block-list'
        ? `          restore-keys:\n            - ${fallback}\n`
        : `          restore-keys: |\n            ${fallback}\n`;
  const twin = spelling.commentPlacement === 'commented-twin' ? `          # key: bank-${runId}-${attempt}\n` : '';
  const comment = scalarComment(spelling);
  const restore = usesStep(
    'Restore bank',
    `actions/cache/restore@${SHA}`,
    `        if: ${alwaysCondition(spelling)}\n        with:${mappingKeyComment(spelling)}\n${pathField(
      'cache-a',
      spelling,
    )}${fullLineComment('          ', spelling)}${twin}          key: ${key}${comment}\n${restoreKeys}`,
    spelling,
  );
  const save = usesStep(
    'Save bank',
    `actions/cache/save@${SHA}`,
    `        if: ${spec.savesAlways ? alwaysCondition(spelling) : 'success()'}\n        with:${mappingKeyComment(spelling)}\n${pathField(
      spec.pathsMatch ? 'cache-a' : 'cache-b',
      spelling,
    )}${fullLineComment('          ', spelling)}${twin}          key: ${key}${comment}\n`,
    spelling,
  );
  const combined = spec.combinedCacheActionPresent
    ? usesStep(
        'Combined cache',
        `actions/cache@${SHA}`,
        '        with:\n          path: cache-a\n          key: combined\n',
        spelling,
      )
    : '';
  return `${restore}${save}${combined}`;
}

function campaignStep(spec: SemanticSpec, spelling: Spelling): string {
  const invocation = spec.campaignStepInvokes
    ? 'pnpm exec tsx packages/cli/src/bin.ts check gates --ir'
    : 'echo no-campaign';
  const mode = spec.campaignStepHasModeFlag ? ' --mutate' : '';
  const budget = spec.budgetPresent
    ? `        env:${mappingKeyComment(spelling)}\n${fullLineComment('          ', spelling)}          LITESHIP_CAMPAIGN_WALL_BUDGET_MS: ${quoted(
        spec.budgetInBounds ? FLOOR : 1,
        spelling,
      )}${scalarComment(spelling)}\n`
    : '';
  const decoy =
    spelling.blockScalarDecoy === 'if-contains-invocation'
      ? `      - run: echo harmless\n        if: |\n          pnpm exec tsx packages/cli/src/bin.ts check gates --ir --mutate\n`
      : '';
  return `${decoy}      - run: ${invocation}${mode}\n${budget}`;
}

function compliantDecoy(spelling: Spelling): string {
  return `${cacheSteps(COMPLIANT_SPEC, spelling)}${campaignStep(COMPLIANT_SPEC, spelling)}`;
}

function workflowOf(spec: SemanticSpec, spelling: Spelling): { readonly text: string; readonly nextJob: string } {
  const nextJob = spelling.idAlphabet === 'lower-hyphen' ? 'next-job' : 'Next_job2';
  const timeout = spec.timeoutAtJobLevel
    ? `    timeout-minutes: ${quoted(150, spelling)}${scalarComment(spelling)}\n`
    : '    # timeout-minutes is deliberately absent\n';
  const nextComment = spelling.trailingComment ? ' # structural boundary' : '';
  const lf = `jobs:\n  ${TARGET_JOB}:\n${timeout}    steps:\n${cacheSteps(spec, spelling)}${campaignStep(
    spec,
    spelling,
  )}  ${nextJob}:${nextComment}\n    timeout-minutes: 150\n    steps:\n${compliantDecoy(spelling)}`;
  return { text: spelling.eol === 'CRLF' ? lf.replaceAll('\n', '\r\n') : lf, nextJob };
}

function expectedViolationKinds(spec: SemanticSpec): ReadonlySet<'cache' | 'budget'> {
  const kinds = new Set<'cache' | 'budget'>();
  if (
    !spec.savesAlways ||
    !spec.keyHasAttempt ||
    !spec.keyHasRunId ||
    !spec.restoreKeysPresent ||
    !spec.firstFallbackRunScoped ||
    !spec.firstFallbackNamespaceBound ||
    !spec.pathsMatch ||
    spec.combinedCacheActionPresent
  ) {
    kinds.add('cache');
  }
  if (
    !spec.budgetPresent ||
    !spec.budgetInBounds ||
    !spec.timeoutAtJobLevel ||
    !spec.campaignStepInvokes ||
    !spec.campaignStepHasModeFlag
  ) {
    kinds.add('budget');
  }
  return kinds;
}

const BASE_SPELLING: Spelling = {
  bullet: 'uses-bullet',
  quoting: 'single',
  expressionSpacing: 'tight',
  commentPlacement: 'none',
  blockScalarDecoy: 'none',
  conditionSpelling: 'plain',
  eol: 'LF',
  idAlphabet: 'lower-hyphen',
  trailingComment: false,
  restoreKeysForm: 'block',
};

const SINGLE_FIELD_DEFECTS: ReadonlyArray<{
  readonly field: keyof SemanticSpec;
  readonly kind: 'cache' | 'budget';
}> = [
  { field: 'savesAlways', kind: 'cache' },
  { field: 'keyHasAttempt', kind: 'cache' },
  { field: 'keyHasRunId', kind: 'cache' },
  { field: 'restoreKeysPresent', kind: 'cache' },
  { field: 'firstFallbackRunScoped', kind: 'cache' },
  { field: 'firstFallbackNamespaceBound', kind: 'cache' },
  { field: 'pathsMatch', kind: 'cache' },
  { field: 'combinedCacheActionPresent', kind: 'cache' },
  { field: 'budgetPresent', kind: 'budget' },
  { field: 'budgetInBounds', kind: 'budget' },
  { field: 'timeoutAtJobLevel', kind: 'budget' },
  { field: 'campaignStepInvokes', kind: 'budget' },
  { field: 'campaignStepHasModeFlag', kind: 'budget' },
];

describe('workflow scanner verdicts depend on semantic specs, not spellings', () => {
  it('keeps cache and budget verdicts invariant across the admitted grammar', () => {
    fc.assert(
      fc.property(SPEC, SPELLING, (spec, spelling) => {
        const generated = workflowOf(spec, spelling);
        expect([...workflowJobSections(generated.text).keys()]).toEqual([TARGET_JOB, generated.nextJob]);
        const expected = expectedViolationKinds(spec);
        expect(scanExhaustiveCachePersistence(generated.text, [TARGET_JOB]).length > 0).toBe(expected.has('cache'));
        expect(scanCampaignWallBudget(generated.text, [TARGET_JOB]).length > 0).toBe(expected.has('budget'));
      }),
      { seed: 0x5ca9be11, numRuns: 300 },
    );
  });

  it('every admitted spelling keeps a fully compliant spec exactly green', () => {
    fc.assert(
      fc.property(SPELLING, (spelling) => {
        const generated = workflowOf(COMPLIANT_SPEC, spelling);
        expect(scanExhaustiveCachePersistence(generated.text, [TARGET_JOB])).toEqual([]);
        expect(scanCampaignWallBudget(generated.text, [TARGET_JOB])).toEqual([]);
      }),
      { seed: 0x5ca9be16, numRuns: 300 },
    );
  });

  it('each single-field defect stays red under every admitted spelling', () => {
    fc.assert(
      fc.property(SPELLING, (spelling) => {
        for (const { field, kind } of SINGLE_FIELD_DEFECTS) {
          const spec = { ...COMPLIANT_SPEC, [field]: field === 'combinedCacheActionPresent' };
          const generated = workflowOf(spec, spelling);
          const violations =
            kind === 'cache'
              ? scanExhaustiveCachePersistence(generated.text, [TARGET_JOB])
              : scanCampaignWallBudget(generated.text, [TARGET_JOB]);
          expect(violations, `${String(field)} must stay red under ${JSON.stringify(spelling)}`).not.toEqual([]);
        }
      }),
      { seed: 0x5ca9be17, numRuns: 220 },
    );
  });

  it.each(SINGLE_FIELD_DEFECTS)('$field alone produces a $kind violation', ({ field, kind }) => {
    const spec = {
      ...COMPLIANT_SPEC,
      [field]: field === 'combinedCacheActionPresent',
    };
    const generated = workflowOf(spec, BASE_SPELLING);
    const violations =
      kind === 'cache'
        ? scanExhaustiveCachePersistence(generated.text, [TARGET_JOB])
        : scanCampaignWallBudget(generated.text, [TARGET_JOB]);
    expect(violations, `${String(field)} must independently have teeth`).not.toEqual([]);
  });

  it('a cache-step-free target stays red when a mixed-id or CRLF next job is compliant', () => {
    const hostileBoundary = fc.record({
      eol: fc.constantFrom<'LF' | 'CRLF'>('LF', 'CRLF'),
      trailingComment: fc.boolean(),
    });
    fc.assert(
      fc.property(hostileBoundary, ({ eol, trailingComment }) => {
        const spelling: Spelling = {
          ...BASE_SPELLING,
          eol,
          idAlphabet: 'mixed-alnum-underscore',
          trailingComment,
        };
        const comment = trailingComment ? ' # hostile boundary' : '';
        const lf = `jobs:\n  ${TARGET_JOB}:\n    steps:\n  Next_job2:${comment}\n    steps:\n${cacheSteps(
          COMPLIANT_SPEC,
          spelling,
        )}`;
        const workflow = eol === 'CRLF' ? lf.replaceAll('\n', '\r\n') : lf;
        expect([...workflowJobSections(workflow).keys()]).toEqual([TARGET_JOB, 'Next_job2']);
        expect(scanExhaustiveCachePersistence(workflow, [TARGET_JOB])).not.toEqual([]);
      }),
      { seed: 0x5ca9be15, numRuns: 160 },
    );
  });

  it('a flow-collection spelling is always refused as unreadable', () => {
    fc.assert(
      fc.property(fc.constantFrom('owner/evil@main', `actions/checkout@${SHA}`), (action) => {
        const workflow = `jobs:\n  ${TARGET_JOB}:\n    steps:\n      - { uses: ${action} }\n`;
        expect(scanExhaustiveCachePersistence(workflow, [TARGET_JOB])).not.toEqual([]);
      }),
      { seed: 0x5ca9be12, numRuns: 160 },
    );
  });

  it('a flow-list restore-keys spelling is refused as unreadable', () => {
    const workflow = `jobs:\n  ${TARGET_JOB}:\n    steps:\n      - uses: actions/cache/restore@${SHA}\n        with:\n          path: cache-a\n          key: bank-\${{ github.run_id }}-\${{ github.run_attempt }}\n          restore-keys: [bank-\${{ github.run_id }}-]\n`;
    expect(scanExhaustiveCachePersistence(workflow, [TARGET_JOB]).some((finding) => finding.includes('flow'))).toBe(
      true,
    );
  });

  it('an empty restore-keys spelling cannot discharge the fallback contract', () => {
    const workflow = `jobs:\n  ${TARGET_JOB}:\n    steps:\n      - uses: actions/cache/restore@${SHA}\n        with:\n          path: cache-a\n          key: bank-\${{ github.run_id }}-\${{ github.run_attempt }}\n          restore-keys:\n      - uses: actions/cache/save@${SHA}\n        if: always()\n        with:\n          path: cache-a\n          key: bank-\${{ github.run_id }}-\${{ github.run_attempt }}\n`;
    expect(scanExhaustiveCachePersistence(workflow, [TARGET_JOB]).some((finding) => finding.includes('fallback'))).toBe(
      true,
    );
  });

  it('a duplicate field is always a violation', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 999 }), (timeout) => {
        const workflow = `jobs:\n  ${TARGET_JOB}:\n    timeout-minutes: ${timeout}\n    timeout-minutes: ${timeout + 1}\n    steps:\n`;
        expect(scanCampaignWallBudget(workflow, [TARGET_JOB])).not.toEqual([]);
      }),
      { seed: 0x5ca9be13, numRuns: 160 },
    );
  });

  it('a skipped-eligible step condition never discharges a contract', () => {
    fc.assert(
      fc.property(fc.constantFrom('success()', 'false'), (condition) => {
        const workflow = `jobs:\n  ${TARGET_JOB}:\n    timeout-minutes: 150\n    steps:\n      - run: pnpm exec tsx packages/cli/src/bin.ts check gates --ir --mutate\n        if: ${condition}\n        env:\n          LITESHIP_CAMPAIGN_WALL_BUDGET_MS: '${FLOOR}'\n`;
        expect(scanCampaignWallBudget(workflow, [TARGET_JOB]).some((finding) => finding.includes('conditional'))).toBe(
          true,
        );
      }),
      { seed: 0x5ca9be14, numRuns: 160 },
    );
  });
});
