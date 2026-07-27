/** Internal host admission adapter for the existing pure DeclaredFix verifier. */

import { contentAddressOf } from '@liteship/core';
import {
  verifyDeclaredFix,
  type ActualChange,
  type DeclaredFix,
  type DeclaredFixFacts,
  type FixReceipt,
  type FixVerdict,
  type StandardsElement,
  type StandardsWaiver,
} from '@liteship/gauntlet';
import { admitChangeIntent, type ChangeIntent, type ChangeIntentAdmission } from './change-intent.js';

export interface GitDiffFileFact {
  readonly path: string;
  readonly addedLines: number;
  readonly removedLines: number;
  readonly beforeBytes: Uint8Array | null;
  readonly afterBytes: Uint8Array | null;
}

export interface GitDiffFacts {
  readonly baseSha: string;
  readonly headSha: string;
  readonly files: readonly GitDiffFileFact[];
}

export interface DeclaredFixStandardsFacts {
  readonly before: readonly StandardsElement[];
  readonly after: readonly StandardsElement[];
  readonly signoffs: readonly StandardsWaiver[];
  readonly alwaysBlockingRuleIds: ReadonlySet<string>;
}

export interface DeclaredFixAdmissionInput {
  readonly declaredFix: DeclaredFix;
  readonly diff: GitDiffFacts;
  readonly standards: DeclaredFixStandardsFacts;
  readonly changeIntent: ChangeIntent;
  readonly changeIntentAdmission: ChangeIntentAdmission;
  readonly now: Date;
}

export interface RecomputedFixFacts {
  readonly actualChange: ActualChange;
  readonly beforeReceipt: FixReceipt;
  readonly afterReceipt: FixReceipt;
}

export type DeclaredFixHostRefusalCode =
  | 'change-intent-refused'
  | 'change-intent-admission-mismatch'
  | 'source-sha-mismatch'
  | 'policy-sponsor-not-human'
  | 'policy-sponsor-self-declared'
  | 'policy-sponsor-not-owner'
  | 'receipt-mismatch';

export interface DeclaredFixAdmissionReceipt {
  readonly _tag: 'declared-fix-admission-receipt';
  readonly intentId: ChangeIntent['intentId'];
  readonly baseSha: string;
  readonly headSha: string;
  readonly beforeReceipt: FixReceipt;
  readonly afterReceipt: FixReceipt;
  readonly verifierVerdict: FixVerdict;
  readonly hostRefusals: readonly DeclaredFixHostRefusalCode[];
  readonly receiptId: string;
}

export interface DeclaredFixHostAdmission {
  readonly accepted: boolean;
  readonly facts: DeclaredFixFacts;
  readonly receipt: DeclaredFixAdmissionReceipt;
}

const POLICY_PATHS = [
  '.github/workflows/',
  'packages/gauntlet/src/',
  'packages/command/src/checks/',
  'scripts/standards-',
  'scripts/lib/change-intent.ts',
  'scripts/lib/declared-fix-admission.ts',
  'traceability/standards-',
] as const;

/** Narrow, explicit classification for files that govern admission or standards. */
export function isPolicyPath(path: string): boolean {
  return POLICY_PATHS.some((prefix) => path === prefix || path.startsWith(prefix));
}

function validSha(value: string, label: string): string {
  if (!/^[0-9a-f]{40}(?:[0-9a-f]{24})?$/.test(value)) throw new TypeError(`${label} must be a full Git SHA`);
  return value;
}

function normalizedDiff(diff: GitDiffFacts): readonly GitDiffFileFact[] {
  validSha(diff.baseSha, 'diff.baseSha');
  validSha(diff.headSha, 'diff.headSha');
  const seen = new Set<string>();
  const files = [...diff.files].sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));
  for (const file of files) {
    if (
      file.path.trim() === '' ||
      file.path.startsWith('/') ||
      file.path.includes('\\') ||
      file.path.split('/').includes('..')
    ) {
      throw new TypeError(`diff path must be normalized repo-relative: ${JSON.stringify(file.path)}`);
    }
    if (seen.has(file.path)) throw new TypeError(`diff contains duplicate path ${file.path}`);
    seen.add(file.path);
    for (const [label, count] of [
      ['addedLines', file.addedLines],
      ['removedLines', file.removedLines],
    ] as const) {
      if (!Number.isSafeInteger(count) || count < 0)
        throw new TypeError(`${file.path} ${label} must be a nonnegative integer`);
    }
    if (file.beforeBytes === null && file.afterBytes === null) {
      throw new TypeError(`${file.path} cannot be absent at both diff endpoints`);
    }
  }
  return files;
}

/**
 * Recompute the exact diff facts and receipts admitted by the host boundary.
 * Hosts use this to construct an honest declaration; admission repeats it so
 * caller-owned receipt data is never authoritative.
 */
export function recomputeFixFacts(
  diff: GitDiffFacts,
  standards: DeclaredFixStandardsFacts,
  now: Date,
): RecomputedFixFacts {
  if (!Number.isFinite(now.getTime())) throw new TypeError('declared-fix facts require a valid injected date');
  const files = Object.freeze(normalizedDiff(diff));
  const stampedAt = now.toISOString();
  const beforeReceipt = mintReceipt(standards.before, files, 'before', stampedAt);
  const afterReceipt = mintReceipt(standards.after, files, 'after', stampedAt);
  const actualChange: ActualChange = Object.freeze({
    _tag: 'actual-change',
    changedFiles: Object.freeze(files.map(({ path }) => path)),
    changedLines: files.reduce((sum, file) => sum + file.addedLines + file.removedLines, 0),
  });
  return Object.freeze({ actualChange, beforeReceipt, afterReceipt });
}

function fileDigest(path: string, bytes: Uint8Array | null): string {
  return String(contentAddressOf(bytes === null ? { path, state: 'absent' } : { path, bytes: [...bytes] }));
}

function mintReceipt(
  standards: readonly StandardsElement[],
  files: readonly GitDiffFileFact[],
  side: 'before' | 'after',
  stampedAt: string,
): FixReceipt {
  return Object.freeze({
    _tag: 'fix-receipt',
    standardsAddress: String(contentAddressOf(standards)),
    touchedDigests: Object.freeze(
      Object.fromEntries(
        files.map((file) => [file.path, fileDigest(file.path, side === 'before' ? file.beforeBytes : file.afterBytes)]),
      ),
    ),
    stampedAt,
  });
}

function receiptPayload(receipt: FixReceipt): unknown {
  return { standardsAddress: receipt.standardsAddress, touchedDigests: receipt.touchedDigests };
}

function sameReceipt(left: FixReceipt, right: FixReceipt): boolean {
  return String(contentAddressOf(receiptPayload(left))) === String(contentAddressOf(receiptPayload(right)));
}

function sameAdmission(left: ChangeIntentAdmission, right: ChangeIntentAdmission): boolean {
  return String(contentAddressOf(left)) === String(contentAddressOf(right));
}

function policyOrStandardsChange(changedFiles: readonly string[], standards: DeclaredFixStandardsFacts): boolean {
  return (
    changedFiles.some((path) => isPolicyPath(path)) ||
    String(contentAddressOf(standards.before)) !== String(contentAddressOf(standards.after))
  );
}

function freezeVerdict(verdict: FixVerdict): FixVerdict {
  if (verdict._tag === 'admitted') return Object.freeze(verdict);
  return Object.freeze({
    _tag: 'rejected' as const,
    reasons: Object.freeze(verdict.reasons.map((reason) => Object.freeze({ ...reason }))),
  });
}

/**
 * Bind a declared fix to explicit Git, standards, and sponsorship facts, then
 * delegate the original semantic verdict to {@link verifyDeclaredFix}.
 */
export function admitDeclaredFix(input: DeclaredFixAdmissionInput): DeclaredFixHostAdmission {
  if (!Number.isFinite(input.now.getTime()))
    throw new TypeError('declared-fix admission requires a valid injected date');
  const { actualChange, beforeReceipt, afterReceipt } = recomputeFixFacts(input.diff, input.standards, input.now);
  const measuredBeforeAddress = beforeReceipt.standardsAddress;
  const measuredAfterAddress = afterReceipt.standardsAddress;
  const verifierVerdict = freezeVerdict(
    verifyDeclaredFix(input.declaredFix, {
      actualChange,
      standardsBefore: input.standards.before,
      standardsAfter: input.standards.after,
      measuredBeforeAddress,
      measuredAfterAddress,
      signoffs: input.standards.signoffs,
      alwaysBlockingRuleIds: input.standards.alwaysBlockingRuleIds,
      now: input.now,
    }),
  );

  const refusals = new Set<DeclaredFixHostRefusalCode>();
  const recomputedIntentAdmission = admitChangeIntent(input.changeIntent);
  if (!sameAdmission(recomputedIntentAdmission, input.changeIntentAdmission)) {
    refusals.add('change-intent-admission-mismatch');
  }
  if (!recomputedIntentAdmission.accepted) refusals.add('change-intent-refused');
  if (input.changeIntent.sourceSha.value !== input.diff.headSha) refusals.add('source-sha-mismatch');
  if (
    !sameReceipt(input.declaredFix.beforeReceipt, beforeReceipt) ||
    !sameReceipt(input.declaredFix.afterReceipt, afterReceipt)
  ) {
    refusals.add('receipt-mismatch');
  }

  if (policyOrStandardsChange(actualChange.changedFiles, input.standards)) {
    if (input.changeIntent.actorClass.value !== 'human') refusals.add('policy-sponsor-not-human');
    if (
      input.changeIntent.actorClass.provenance !== 'github-verified' ||
      input.changeIntent.sponsor.provenance !== 'github-verified'
    ) {
      refusals.add('policy-sponsor-self-declared');
    }
    if (!['repository-owner', 'code-owner'].includes(input.changeIntent.sponsor.value.ownership)) {
      refusals.add('policy-sponsor-not-owner');
    }
  }

  const hostRefusals = Object.freeze([...refusals].sort());
  const unsignedReceipt = {
    _tag: 'declared-fix-admission-receipt' as const,
    intentId: input.changeIntent.intentId,
    baseSha: input.diff.baseSha,
    headSha: input.diff.headSha,
    beforeReceipt,
    afterReceipt,
    verifierVerdict,
    hostRefusals,
  };
  const receipt = Object.freeze({
    ...unsignedReceipt,
    receiptId: String(contentAddressOf(unsignedReceipt)),
  });
  return Object.freeze({
    accepted: hostRefusals.length === 0 && verifierVerdict._tag === 'admitted',
    facts: Object.freeze({ intent: input.declaredFix.intent, verdict: verifierVerdict }),
    receipt,
  });
}
