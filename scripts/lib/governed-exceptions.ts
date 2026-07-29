/**
 * One internal governed-exception view projected from three canonical owners.
 *
 * This module owns no exception policy. Standards sign-offs, testing-ledger
 * waivers, and obligations remain authored and validated by their existing
 * owners; this adapter only normalizes their already-decided records.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnArgvCapture } from './spawn.js';
import {
  buildStandardsIntegrityFacts,
  liveStandardsSignoffKeys,
  readStandardsWaivers,
  STANDARDS_WAIVERS_PATH,
  type StandardsIntegrityResult,
} from '../../packages/cli/src/internal/standards-surface.js';
import {
  buildObligationLedger,
  buildTraceabilityFacts,
  type ObligationLedger,
} from '../../packages/cli/src/internal/traceability.js';
import type { TraceabilityFacts } from '../../packages/gauntlet/src/index.js';

export const TESTING_LEDGER_PATH = 'traceability/testing-ledger.yaml';
export const OBLIGATIONS_LEDGER_PATH = 'traceability/obligations.yaml';

export type GovernedExceptionSourceKind = 'standards-signoff' | 'testing-ledger-waiver' | 'obligation';
export type GovernedExceptionStatus = 'active' | 'expired' | 'stale';

export interface GovernedException {
  readonly owner: string;
  readonly scope: string;
  readonly rationale: string;
  readonly compensatingProof: string;
  /** Commit date of the canonical source revision currently governing this record. */
  readonly effectiveDate: string;
  readonly expiry: string;
  readonly status: GovernedExceptionStatus;
  readonly sourceKind: GovernedExceptionSourceKind;
  readonly sourceId: string;
  readonly sourcePath: string;
}

export interface GovernedExceptionSources {
  readonly standardsWaivers: ReturnType<typeof readStandardsWaivers>;
  readonly standardsIntegrity: StandardsIntegrityResult;
  /** Current-tree exception identities; sign-off liveness never depends on Git history. */
  readonly liveStandardsSignoffKeys: ReadonlySet<string>;
  readonly traceability: TraceabilityFacts;
  readonly obligations: ObligationLedger;
}

export type EffectiveDateResolver = (sourcePath: string) => string;
export type GitDateRunner = (
  args: readonly string[],
  cwd: string,
) => Promise<{ readonly exitCode: number; readonly stdout: string }>;

function liveGovernedExceptionSources(repoRoot: string, now: Date): GovernedExceptionSources {
  return {
    standardsWaivers: readStandardsWaivers(repoRoot),
    standardsIntegrity: buildStandardsIntegrityFacts(repoRoot, now),
    liveStandardsSignoffKeys: liveStandardsSignoffKeys(repoRoot),
    traceability: buildTraceabilityFacts(repoRoot, now),
    obligations: buildObligationLedger(repoRoot),
  };
}

/**
 * Decide whether a sign-off still governs the current tree.
 *
 * Baseline-relative standards facts answer a different question: whether this
 * change weakened rigor compared with the review base. They cannot decide
 * current liveness because the same tree has different diffs on a PR branch and
 * after merge. Presence-based exception classes are intentionally the only
 * admitted classes here. A future state-relative sign-off must add an explicit
 * tree-local after-state witness instead of borrowing Git history.
 */
function standardsSignoffIsLive(
  sourceId: string,
  weakening: GovernedExceptionSources['standardsWaivers'][number]['weakening'],
  liveSignoffKeys: ReadonlySet<string>,
): boolean {
  switch (weakening) {
    case 'skip-allowlist-added':
    case 'waiver-added':
      return liveSignoffKeys.has(sourceId);
    default:
      throw new Error(
        `governed exception ${sourceId} uses ${weakening}, which has no tree-local liveness witness; refusing the view`,
      );
  }
}

function requireText(value: string, field: string, sourceId: string): string {
  if (value.trim() === '') throw new Error(`governed exception ${sourceId} is missing ${field}`);
  return value;
}

function isoDay(value: string, field: string, sourceId: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`governed exception ${sourceId} has malformed ${field} ${JSON.stringify(value)}`);
  }
  const instant = Date.parse(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(instant) || new Date(instant).toISOString().slice(0, 10) !== value) {
    throw new Error(`governed exception ${sourceId} has impossible ${field} ${JSON.stringify(value)}`);
  }
  return instant;
}

function activeDateStatus(effectiveDate: string, expiry: string, now: Date, sourceId: string): GovernedExceptionStatus {
  const effective = isoDay(effectiveDate, 'effective date', sourceId);
  const expires = isoDay(expiry, 'expiry', sourceId);
  if (expires < now.getTime()) return 'expired';
  return effective > now.getTime() || effective > expires ? 'stale' : 'active';
}

function admitted(record: GovernedException): GovernedException {
  for (const field of ['owner', 'scope', 'rationale', 'compensatingProof', 'sourceId', 'sourcePath'] as const) {
    requireText(record[field], field, record.sourceId);
  }
  if (record.status !== 'active') {
    throw new Error(
      `governed exception ${record.sourceKind}:${record.sourceId} is ${record.status}; refusing the view`,
    );
  }
  return Object.freeze(record);
}

/** Pure projection over already-validated canonical owner results. */
export function projectGovernedExceptions(
  sources: GovernedExceptionSources,
  now: Date,
  effectiveDateOf: EffectiveDateResolver,
): readonly GovernedException[] {
  if (!Number.isFinite(now.getTime())) throw new Error('governed exception view requires a valid injected date');
  if (sources.standardsIntegrity._tag !== 'active') {
    throw new Error('governed exception view refuses an inactive standards authority');
  }
  if (sources.obligations.divergences.length > 0) {
    throw new Error('governed exception view refuses an obligation ledger with source-marker divergences');
  }

  const out: GovernedException[] = [];
  const standardsEffective = effectiveDateOf(STANDARDS_WAIVERS_PATH);
  for (const waiver of sources.standardsWaivers) {
    const sourceId = `${waiver.elementKey}::${waiver.weakening}`;
    requireText(waiver.elementKey, 'scope', sourceId);
    requireText(waiver.weakening, 'scope', sourceId);
    requireText(waiver.owner, 'owner', sourceId);
    requireText(waiver.justification, 'rationale', sourceId);
    const dateStatus = activeDateStatus(standardsEffective, waiver.expiry, now, sourceId);
    const sourceStatus: GovernedExceptionStatus =
      dateStatus === 'active' && !standardsSignoffIsLive(sourceId, waiver.weakening, sources.liveStandardsSignoffKeys)
        ? 'stale'
        : dateStatus;
    out.push(
      admitted({
        owner: waiver.owner,
        scope: `${waiver.weakening} at ${waiver.elementKey}`,
        rationale: waiver.justification,
        compensatingProof: `Current-tree liveness admits the governed standards element ${waiver.elementKey}.`,
        effectiveDate: standardsEffective,
        expiry: waiver.expiry,
        status: sourceStatus,
        sourceKind: 'standards-signoff',
        sourceId,
        sourcePath: STANDARDS_WAIVERS_PATH,
      }),
    );
  }

  const testingEffective = effectiveDateOf(TESTING_LEDGER_PATH);
  for (const invariant of sources.traceability.invariants) {
    if (invariant.state._tag !== 'waived' && invariant.state._tag !== 'expired') continue;
    requireText(invariant.id, 'sourceId', invariant.id);
    requireText(invariant.law, 'scope', invariant.id);
    requireText(invariant.state.owner, 'owner', invariant.id);
    requireText(invariant.state.justification, 'compensatingProof', invariant.id);
    const status =
      invariant.state._tag === 'expired'
        ? 'expired'
        : activeDateStatus(testingEffective, invariant.state.expiry, now, invariant.id);
    out.push(
      admitted({
        owner: invariant.state.owner,
        scope: `${invariant.id}: ${invariant.law}`,
        rationale: `Owner-signed deferral of dedicated proof for ${invariant.id}.`,
        compensatingProof: invariant.state.justification,
        effectiveDate: testingEffective,
        expiry: invariant.state.expiry,
        status,
        sourceKind: 'testing-ledger-waiver',
        sourceId: invariant.id,
        sourcePath: TESTING_LEDGER_PATH,
      }),
    );
  }

  const obligationEffective = effectiveDateOf(OBLIGATIONS_LEDGER_PATH);
  for (const obligation of sources.obligations.obligations) {
    requireText(obligation.id, 'sourceId', obligation.id);
    requireText(obligation.class, 'scope', obligation.id);
    requireText(obligation.owner, 'owner', obligation.id);
    requireText(obligation.pointer, 'scope', obligation.id);
    requireText(obligation.note, 'rationale', obligation.id);
    out.push(
      admitted({
        owner: obligation.owner,
        scope: `${obligation.class}: ${obligation.pointer}`,
        rationale: obligation.note,
        compensatingProof: `Registered pointer reconciled by the obligation ledger: ${obligation.pointer}`,
        effectiveDate: obligationEffective,
        expiry: obligation.reviewBy,
        status: activeDateStatus(obligationEffective, obligation.reviewBy, now, obligation.id),
        sourceKind: 'obligation',
        sourceId: obligation.id,
        sourcePath: OBLIGATIONS_LEDGER_PATH,
      }),
    );
  }

  const seen = new Set<string>();
  for (const record of out) {
    const key = `${record.sourceKind}:${record.sourceId}`;
    if (seen.has(key)) throw new Error(`duplicate governed exception source identity ${key}`);
    seen.add(key);
  }
  return Object.freeze(
    [...out].sort(
      (left, right) => left.sourceKind.localeCompare(right.sourceKind) || left.sourceId.localeCompare(right.sourceId),
    ),
  );
}

/**
 * Resolve the effective date from committed Git provenance, cached once per
 * canonical source file. A dirty/untracked source has no committed governing
 * revision and therefore fails closed instead of borrowing an invented date.
 */
export async function committedSourceEffectiveDate(
  repoRoot: string,
  runGit: GitDateRunner = async (args, cwd) => spawnArgvCapture('git', args, { cwd }),
): Promise<EffectiveDateResolver> {
  const paths = [STANDARDS_WAIVERS_PATH, TESTING_LEDGER_PATH, OBLIGATIONS_LEDGER_PATH];
  const entries = await Promise.all(
    paths.map(async (sourcePath): Promise<readonly [string, string]> => {
      if (!existsSync(join(repoRoot, sourcePath))) {
        throw new Error(`canonical exception source is missing: ${sourcePath}`);
      }
      const diff = await runGit(['diff', '--quiet', '--', sourcePath], repoRoot);
      const stagedDiff = await runGit(['diff', '--cached', '--quiet', '--', sourcePath], repoRoot);
      if (diff.exitCode !== 0 || stagedDiff.exitCode !== 0) {
        throw new Error(`canonical exception source has no clean committed provenance: ${sourcePath}`);
      }
      const log = await runGit(['log', '-1', '--format=%cs', '--', sourcePath], repoRoot);
      const date = log.stdout.trim();
      if (log.exitCode !== 0) {
        throw new Error(`canonical exception source has no committed provenance: ${sourcePath}`);
      }
      isoDay(date, 'effective date', sourcePath);
      return [sourcePath, date] as const;
    }),
  );
  const dates = new Map(entries);
  return (sourcePath) => {
    const date = dates.get(sourcePath);
    if (date === undefined) throw new Error(`canonical exception source date was not resolved: ${sourcePath}`);
    return date;
  };
}

/** Build the internal view from the three real canonical owners. */
export async function buildGovernedExceptionView(repoRoot: string, now: Date): Promise<readonly GovernedException[]> {
  for (const path of [STANDARDS_WAIVERS_PATH, TESTING_LEDGER_PATH, OBLIGATIONS_LEDGER_PATH]) {
    if (!existsSync(join(repoRoot, path))) throw new Error(`canonical exception source is missing: ${path}`);
  }
  const effectiveDateOf = await committedSourceEffectiveDate(repoRoot);
  return projectGovernedExceptions(liveGovernedExceptionSources(repoRoot, now), now, effectiveDateOf);
}

/**
 * Pre-commit projection over the current working/index view.
 *
 * Final delivery evidence still uses {@link buildGovernedExceptionView} and
 * therefore requires clean committed Git provenance. A commit hook cannot use
 * that rule when the canonical exception source itself is staged: doing so
 * would make a valid waiver/ledger edit impossible to commit. This prospective
 * view uses the injected current UTC day as the would-be commit date, while
 * retaining every semantic, liveness, expiry, divergence, and signed-partition
 * refusal in the canonical projection.
 */
export function buildProspectiveGovernedExceptionView(repoRoot: string, now: Date): readonly GovernedException[] {
  if (!Number.isFinite(now.getTime())) throw new Error('prospective governed exception view requires a valid date');
  const prospectiveDate = now.toISOString().slice(0, 10);
  return projectGovernedExceptions(liveGovernedExceptionSources(repoRoot, now), now, () => prospectiveDate);
}
