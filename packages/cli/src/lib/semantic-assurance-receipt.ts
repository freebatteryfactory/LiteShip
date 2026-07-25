/** Addressed execution receipts for mutation and MC/DC semantic campaigns. @module */

import { createHash } from 'node:crypto';
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { currentEnvFingerprint } from '@liteship/command/host';
import type {
  AssuranceTargetReason,
  McdcFacts,
  MutationFacts,
  RepoIR,
  SemanticAssuranceRequirement,
} from '@liteship/gauntlet';
import type { AssuranceTargetSelection } from './mutation-targets.js';
import { gauntletToolchainDigest } from './gauntlet-verdict-cache.js';

export type SemanticAssuranceMode = Extract<SemanticAssuranceRequirement, 'mutation' | 'mcdc'>;

export const SEMANTIC_ASSURANCE_RECEIPT_PATHS = {
  mutation: 'reports/semantic-assurance-mutation.json',
  mcdc: 'reports/semantic-assurance-mcdc.json',
} as const satisfies Readonly<Record<SemanticAssuranceMode, string>>;

/** The receipt's mode-separated fact-producing toolchain identity. */
export function semanticAssuranceReceiptToolchainDigest(mode: SemanticAssuranceMode): string {
  return gauntletToolchainDigest({
    ...currentEnvFingerprint(),
    semanticAssuranceReceipt: 'v1',
    semanticAssuranceMode: mode,
  });
}

export interface SemanticAssuranceTargetReceipt {
  readonly file: string;
  readonly sourceDigest: string;
  readonly reasons: readonly AssuranceTargetReason[];
  readonly applicable: number;
  readonly evaluated: number;
  readonly killed: number;
  readonly survived: number;
  readonly noCoverage: number;
  readonly equivalent: number;
  readonly executedTests: readonly string[];
  readonly outcomeDigest: `sha256:${string}`;
  readonly verdict: 'pass' | 'fail' | 'not-applicable';
}

export interface SemanticAssuranceReceiptUnsigned {
  readonly schemaVersion: 1;
  readonly kind: 'semantic-assurance-execution';
  readonly mode: SemanticAssuranceMode;
  readonly producer: '@liteship/cli/semantic-assurance-v1';
  readonly toolchainDigest: string;
  readonly selectionDigest: `sha256:${string}`;
  readonly targets: readonly SemanticAssuranceTargetReceipt[];
  readonly verdict: 'pass' | 'fail';
}

export interface SemanticAssuranceReceipt extends SemanticAssuranceReceiptUnsigned {
  readonly receiptId: `sha256:${string}`;
}

type UnknownRecord = Record<string, unknown>;

function codeUnitCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function stableJson(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('semantic assurance receipt contains a non-finite number');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (typeof value === 'object') {
    const record = value as UnknownRecord;
    return `{${Object.keys(record)
      .sort(codeUnitCompare)
      .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
      .join(',')}}`;
  }
  throw new TypeError(`semantic assurance receipt cannot contain ${typeof value}`);
}

function digest(value: unknown): `sha256:${string}` {
  return `sha256:${createHash('sha256').update(stableJson(value), 'utf8').digest('hex')}`;
}

function sortedUnique(values: Iterable<string>): readonly string[] {
  return [...new Set(values)].sort(codeUnitCompare);
}

function sourceDigest(ir: RepoIR, file: string): string {
  const digestValue = ir.files.get(file)?.contentDigest;
  if (digestValue === undefined) throw new TypeError(`semantic assurance target is absent from the RepoIR: ${file}`);
  return digestValue;
}

function selectionPayload(targets: readonly SemanticAssuranceTargetReceipt[]): unknown {
  return targets.map(({ file, sourceDigest: source, reasons }) => ({ file, sourceDigest: source, reasons }));
}

function mutationTargetReceipt(
  row: MutationFacts['targetCensus'][number],
  facts: MutationFacts,
  ir: RepoIR,
): SemanticAssuranceTargetReceipt {
  const outcomes = facts.outcomes.filter((outcome) => outcome.file === row.file);
  if (outcomes.length !== row.applicableMutants) {
    throw new TypeError(
      `mutation receipt target ${row.file} evaluated ${outcomes.length} outcomes but declared ${row.applicableMutants} applicable mutants`,
    );
  }
  const killed = outcomes.filter((outcome) => outcome.verdict === 'killed').length;
  const survived = outcomes.filter((outcome) => outcome.verdict === 'survived').length;
  const noCoverage = outcomes.filter((outcome) => outcome.verdict === 'no-coverage').length;
  const equivalent = outcomes.filter((outcome) => outcome.verdict === 'equivalent').length;
  const executedTests = sortedUnique(outcomes.flatMap((outcome) => outcome.coveringTests));
  const executable = killed + survived;
  if (executable > 0 && executedTests.length === 0) {
    throw new TypeError(`mutation receipt target ${row.file} records executed outcomes but no executed tests`);
  }
  const verdict =
    row.applicableMutants === 0
      ? 'not-applicable'
      : survived > 0 || noCoverage > 0 || (executable > 0 && executedTests.length === 0)
        ? 'fail'
        : 'pass';
  return Object.freeze({
    file: row.file,
    sourceDigest: sourceDigest(ir, row.file),
    reasons: Object.freeze([...row.reasons]),
    applicable: row.applicableMutants,
    evaluated: outcomes.length,
    killed,
    survived,
    noCoverage,
    equivalent,
    executedTests: Object.freeze(executedTests),
    outcomeDigest: digest(outcomes),
    verdict,
  });
}

function mcdcTargetReceipt(
  row: McdcFacts['targetCensus'][number],
  facts: McdcFacts,
  ir: RepoIR,
): SemanticAssuranceTargetReceipt {
  const outcomes = facts.conditions.filter((condition) => condition.file === row.file);
  if (outcomes.length !== row.applicableConditions) {
    throw new TypeError(
      `MC/DC receipt target ${row.file} evaluated ${outcomes.length} conditions but declared ${row.applicableConditions} applicable conditions`,
    );
  }
  const killed = outcomes.filter(
    (outcome) => outcome.forceTrueVerdict === 'killed' && outcome.forceFalseVerdict === 'killed',
  ).length;
  const noCoverage = outcomes.filter(
    (outcome) => outcome.forceTrueVerdict === 'no-coverage' && outcome.forceFalseVerdict === 'no-coverage',
  ).length;
  const survived = outcomes.length - killed - noCoverage;
  const executedTests = sortedUnique(outcomes.flatMap((outcome) => outcome.coveringTests));
  if (row.applicableConditions > 0 && executedTests.length === 0) {
    throw new TypeError(`MC/DC receipt target ${row.file} records evaluated conditions but no executed tests`);
  }
  const verdict =
    row.applicableConditions === 0
      ? 'not-applicable'
      : survived > 0 || noCoverage > 0 || executedTests.length === 0
        ? 'fail'
        : 'pass';
  return Object.freeze({
    file: row.file,
    sourceDigest: sourceDigest(ir, row.file),
    reasons: Object.freeze([...row.reasons]),
    applicable: row.applicableConditions,
    evaluated: outcomes.length,
    killed,
    survived,
    noCoverage,
    equivalent: 0,
    executedTests: Object.freeze(executedTests),
    outcomeDigest: digest(outcomes),
    verdict,
  });
}

/** Mint a deterministic receipt from the exact facts the lean gate folds. */
export function buildSemanticAssuranceReceipt(input: {
  readonly mode: SemanticAssuranceMode;
  readonly facts: MutationFacts | McdcFacts;
  readonly ir: RepoIR;
  readonly toolchainDigest: string;
}): SemanticAssuranceReceipt {
  if (input.toolchainDigest.length === 0) throw new TypeError('semantic assurance receipt requires a toolchain digest');
  const census = input.facts.targetCensus;
  if (census.length === 0) throw new TypeError('semantic assurance receipt requires a non-empty target census');
  const targets = (
    input.mode === 'mutation'
      ? (census as MutationFacts['targetCensus']).map((row) =>
          mutationTargetReceipt(row, input.facts as MutationFacts, input.ir),
        )
      : (census as McdcFacts['targetCensus']).map((row) => mcdcTargetReceipt(row, input.facts as McdcFacts, input.ir))
  ).sort((left, right) => codeUnitCompare(left.file, right.file));
  const unsigned: SemanticAssuranceReceiptUnsigned = Object.freeze({
    schemaVersion: 1,
    kind: 'semantic-assurance-execution',
    mode: input.mode,
    producer: '@liteship/cli/semantic-assurance-v1',
    toolchainDigest: input.toolchainDigest,
    selectionDigest: digest(selectionPayload(targets)),
    targets: Object.freeze(targets),
    verdict: targets.every((target) => target.verdict !== 'fail') ? 'pass' : 'fail',
  });
  return Object.freeze({ ...unsigned, receiptId: digest(unsigned) });
}

function exactKeys(value: object, expected: readonly string[], label: string): void {
  const actual = Reflect.ownKeys(value);
  if (actual.some((key) => typeof key !== 'string')) throw new TypeError(`${label} contains a symbol key`);
  const left = (actual as string[]).sort(codeUnitCompare);
  const right = [...expected].sort(codeUnitCompare);
  if (left.length !== right.length || left.some((key, index) => key !== right[index])) {
    throw new TypeError(`${label} keys must be exactly ${right.join(', ')}`);
  }
}

function isReason(value: unknown): value is AssuranceTargetReason {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const reason = value as UnknownRecord;
  if (reason['kind'] === 'effective-level') {
    exactKeys(reason, ['kind', 'level'], 'semantic assurance effective-level reason');
    return reason['level'] === 'L4';
  }
  if (reason['kind'] !== 'semantic-campaign') return false;
  exactKeys(reason, ['kind', 'campaignId', 'owner', 'class', 'required'], 'semantic assurance campaign reason');
  return (
    typeof reason['campaignId'] === 'string' &&
    reason['campaignId'].length > 0 &&
    typeof reason['owner'] === 'string' &&
    reason['owner'].length > 0 &&
    reason['class'] === 'semantic-l4' &&
    Array.isArray(reason['required']) &&
    reason['required'].length > 0 &&
    reason['required'].every((item) => item === 'mutation' || item === 'mcdc')
  );
}

/** Parse and cryptographically self-check an untrusted receipt document. */
export function parseSemanticAssuranceReceipt(value: unknown): SemanticAssuranceReceipt {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('semantic assurance receipt must be an object');
  }
  exactKeys(
    value,
    [
      'schemaVersion',
      'kind',
      'mode',
      'producer',
      'toolchainDigest',
      'selectionDigest',
      'targets',
      'verdict',
      'receiptId',
    ],
    'semantic assurance receipt',
  );
  const receipt = value as Partial<SemanticAssuranceReceipt>;
  if (
    receipt.schemaVersion !== 1 ||
    receipt.kind !== 'semantic-assurance-execution' ||
    (receipt.mode !== 'mutation' && receipt.mode !== 'mcdc') ||
    receipt.producer !== '@liteship/cli/semantic-assurance-v1' ||
    typeof receipt.toolchainDigest !== 'string' ||
    !/^sha256:[0-9a-f]{64}$/u.test(receipt.selectionDigest ?? '') ||
    !/^sha256:[0-9a-f]{64}$/u.test(receipt.receiptId ?? '') ||
    (receipt.verdict !== 'pass' && receipt.verdict !== 'fail') ||
    !Array.isArray(receipt.targets) ||
    receipt.targets.length === 0
  ) {
    throw new TypeError('semantic assurance receipt envelope is invalid');
  }
  const seen = new Set<string>();
  for (const [index, target] of receipt.targets.entries()) {
    if (typeof target !== 'object' || target === null || Array.isArray(target)) {
      throw new TypeError(`semantic assurance target ${index} is invalid`);
    }
    exactKeys(
      target,
      [
        'file',
        'sourceDigest',
        'reasons',
        'applicable',
        'evaluated',
        'killed',
        'survived',
        'noCoverage',
        'equivalent',
        'executedTests',
        'outcomeDigest',
        'verdict',
      ],
      `semantic assurance target ${index}`,
    );
    const counts = [
      target.applicable,
      target.evaluated,
      target.killed,
      target.survived,
      target.noCoverage,
      target.equivalent,
    ];
    if (
      typeof target.file !== 'string' ||
      target.file.length === 0 ||
      seen.has(target.file) ||
      typeof target.sourceDigest !== 'string' ||
      !Array.isArray(target.reasons) ||
      target.reasons.length === 0 ||
      !target.reasons.every(isReason) ||
      counts.some((count) => !Number.isInteger(count) || (count as number) < 0) ||
      !Array.isArray(target.executedTests) ||
      !target.executedTests.every((test: unknown) => typeof test === 'string' && test.length > 0) ||
      !/^sha256:[0-9a-f]{64}$/u.test(target.outcomeDigest) ||
      (target.verdict !== 'pass' && target.verdict !== 'fail' && target.verdict !== 'not-applicable')
    ) {
      throw new TypeError(`semantic assurance target ${index} fields are invalid`);
    }
    seen.add(target.file);
    if (target.evaluated !== target.applicable)
      throw new TypeError(`semantic assurance target ${target.file} is partial`);
    if (target.killed + target.survived + target.noCoverage + target.equivalent !== target.evaluated) {
      throw new TypeError(`semantic assurance target ${target.file} counts do not close`);
    }
    if (target.applicable === 0 && target.verdict !== 'not-applicable') {
      throw new TypeError(`semantic assurance target ${target.file} must record zero applicability explicitly`);
    }
    if (target.applicable > 0 && target.killed + target.survived > 0 && target.executedTests.length === 0) {
      throw new TypeError(`semantic assurance target ${target.file} records no executed tests`);
    }
  }
  const typed = receipt as SemanticAssuranceReceipt;
  const { receiptId, ...unsigned } = typed;
  if (receiptId !== digest(unsigned)) throw new TypeError('semantic assurance receipt identity mismatch');
  if (typed.selectionDigest !== digest(selectionPayload(typed.targets))) {
    throw new TypeError('semantic assurance receipt selection identity mismatch');
  }
  const expectedVerdict = typed.targets.every((target) => target.verdict !== 'fail') ? 'pass' : 'fail';
  if (typed.verdict !== expectedVerdict) throw new TypeError('semantic assurance receipt verdict mismatch');
  return Object.freeze(typed);
}

/** Independently bind a parsed receipt to the current IR, selector, and toolchain. */
export function verifySemanticAssuranceReceipt(
  receipt: SemanticAssuranceReceipt,
  expected: {
    readonly mode: SemanticAssuranceMode;
    readonly ir: RepoIR;
    readonly selection: AssuranceTargetSelection;
    readonly toolchainDigest: string;
  },
): void {
  if (receipt.mode !== expected.mode) throw new TypeError('semantic assurance receipt mode mismatch');
  if (receipt.toolchainDigest !== expected.toolchainDigest) {
    throw new TypeError('semantic assurance receipt toolchain mismatch');
  }
  if (expected.selection.unresolvedEntrypoints.length > 0) {
    throw new TypeError(
      `semantic assurance selection has unresolved entrypoints: ${expected.selection.unresolvedEntrypoints.join(', ')}`,
    );
  }
  const expectedRows = expected.selection.expectedTargets.map((target) => ({
    file: target.file,
    sourceDigest: sourceDigest(expected.ir, target.file),
    reasons: target.reasons,
  }));
  const observedRows = receipt.targets.map(({ file, sourceDigest: source, reasons }) => ({
    file,
    sourceDigest: source,
    reasons,
  }));
  if (stableJson(observedRows) !== stableJson(expectedRows)) {
    throw new TypeError('semantic assurance receipt target census or source digest is stale');
  }
  if (receipt.verdict !== 'pass') throw new TypeError('semantic assurance receipt did not pass');
}

/** Atomically write one ignored run artifact for later independent admission. */
export function writeSemanticAssuranceReceipt(repoRoot: string, receipt: SemanticAssuranceReceipt): string {
  const relativePath = SEMANTIC_ASSURANCE_RECEIPT_PATHS[receipt.mode];
  const path = join(repoRoot, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  renameSync(temporary, path);
  return relativePath;
}
