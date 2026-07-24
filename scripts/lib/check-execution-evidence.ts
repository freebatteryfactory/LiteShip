/** Addressed observation of one canonical check's execution in GitHub Actions. @module */

import { createHash } from 'node:crypto';
import type { CheckEvidenceManifestRequirement } from '../../packages/command/src/checks/evidence-requirements.js';

export interface ObservedGithubJob {
  readonly name: string;
  readonly conclusion: string | null;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly runAttempt: number;
}

export interface CheckExecutionIdentity {
  readonly repository: string;
  readonly workflow: string;
  readonly runId: string;
  readonly runAttempt: string;
}

export interface CheckExecutionEvidenceUnsigned {
  readonly schemaVersion: 1;
  readonly requirementId: string;
  readonly checkId: string;
  readonly kind: 'check-report';
  readonly path: string;
  readonly source: {
    readonly headSha: string;
    readonly planId: `sha256:${string}`;
  };
  readonly producer: {
    readonly checkId: string;
    readonly command: string;
    readonly verifier: string;
    readonly identity: CheckExecutionIdentity;
    readonly jobs: readonly ObservedGithubJob[];
    readonly platforms: readonly string[];
  };
  readonly result: {
    readonly verdict: 'pass' | 'fail' | 'skipped';
    readonly durationMs: number;
    readonly cacheHit: false;
    readonly findings: readonly string[];
  };
}

export interface CheckExecutionEvidence extends CheckExecutionEvidenceUnsigned {
  readonly evidenceId: `sha256:${string}`;
}

export interface BuildCheckExecutionEvidenceInput {
  readonly requirement: CheckEvidenceManifestRequirement;
  readonly headSha: string;
  readonly planId: `sha256:${string}`;
  readonly identity: CheckExecutionIdentity;
  readonly jobs: readonly ObservedGithubJob[];
  readonly platforms: readonly string[];
}

type UnknownRecord = Record<string, unknown>;

function exactKeys(value: object, expected: readonly string[], label: string): void {
  const actual = Reflect.ownKeys(value);
  if (actual.some((key) => typeof key !== 'string')) throw new TypeError(`${label} contains a symbol key`);
  const sortedActual = (actual as string[]).sort(codeUnitCompare);
  const sortedExpected = [...expected].sort(codeUnitCompare);
  if (
    sortedActual.length !== sortedExpected.length ||
    sortedActual.some((key, index) => key !== sortedExpected[index])
  ) {
    throw new TypeError(`${label} keys must be exactly ${sortedExpected.join(', ')}`);
  }
}

function stableJson(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('check execution evidence contains a non-finite number');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (typeof value === 'object') {
    const record = value as UnknownRecord;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
      .join(',')}}`;
  }
  throw new TypeError(`check execution evidence cannot contain ${typeof value}`);
}

function digest(value: CheckExecutionEvidenceUnsigned): `sha256:${string}` {
  return `sha256:${createHash('sha256').update(stableJson(value), 'utf8').digest('hex')}`;
}

function codeUnitCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function validDate(value: string): boolean {
  return value.length > 0 && Number.isFinite(Date.parse(value));
}

function snapshotJobs(jobs: readonly ObservedGithubJob[]): readonly ObservedGithubJob[] {
  if (jobs.length === 0) throw new TypeError('check execution evidence requires at least one observed GitHub job');
  const seen = new Set<string>();
  return Object.freeze(
    [...jobs]
      .map((job) => {
        if (job.name.trim() !== job.name || job.name.length === 0) throw new TypeError('observed job name is invalid');
        if (!validDate(job.startedAt) || !validDate(job.completedAt)) {
          throw new TypeError(`observed job ${job.name} has invalid timestamps`);
        }
        if (Date.parse(job.completedAt) < Date.parse(job.startedAt)) {
          throw new TypeError(`observed job ${job.name} completes before it starts`);
        }
        if (!Number.isInteger(job.runAttempt) || job.runAttempt < 1) {
          throw new TypeError(`observed job ${job.name} has an invalid run attempt`);
        }
        const key = `${job.name}\0${job.runAttempt}`;
        if (seen.has(key)) throw new TypeError(`duplicate observed job ${job.name} attempt ${job.runAttempt}`);
        seen.add(key);
        return Object.freeze({ ...job });
      })
      .sort((left, right) => codeUnitCompare(left.name, right.name) || left.runAttempt - right.runAttempt),
  );
}

function resultFor(jobs: readonly ObservedGithubJob[]): CheckExecutionEvidenceUnsigned['result'] {
  const durationMs = jobs.reduce(
    (total, job) => total + Math.max(0, Date.parse(job.completedAt) - Date.parse(job.startedAt)),
    0,
  );
  const conclusions = jobs.map((job) => job.conclusion);
  const verdict = conclusions.every((conclusion) => conclusion === 'success')
    ? ('pass' as const)
    : conclusions.some(
          (conclusion) => conclusion === 'failure' || conclusion === 'cancelled' || conclusion === 'timed_out',
        )
      ? ('fail' as const)
      : ('skipped' as const);
  const findings =
    verdict === 'pass'
      ? []
      : jobs
          .filter((job) => job.conclusion !== 'success')
          .map((job) => `${job.name}: ${job.conclusion ?? 'incomplete'}`);
  return Object.freeze({ verdict, durationMs, cacheHit: false as const, findings: Object.freeze(findings) });
}

function nonEmpty(value: string, label: string): string {
  if (value.trim() !== value || value.length === 0) throw new TypeError(`${label} must be a non-empty trimmed string`);
  return value;
}

/** Build immutable evidence from registry ownership and GitHub-observed completed jobs. */
export function buildCheckExecutionEvidence(input: BuildCheckExecutionEvidenceInput): CheckExecutionEvidence {
  if (input.requirement.kind !== 'check-report')
    throw new TypeError('check execution evidence requires check-report kind');
  if (!/^[0-9a-f]{40}$/u.test(input.headSha)) throw new TypeError('check execution headSha must be a full Git SHA');
  if (!/^sha256:[0-9a-f]{64}$/u.test(input.planId)) throw new TypeError('check execution planId is invalid');
  for (const [key, value] of Object.entries(input.identity)) nonEmpty(value, `identity.${key}`);
  const jobs = snapshotJobs(input.jobs);
  const platforms = Object.freeze(
    [...new Set(input.platforms.map((value) => nonEmpty(value, 'platform')))].sort(codeUnitCompare),
  );
  if (platforms.length === 0) throw new TypeError('check execution evidence requires at least one platform');
  const unsigned: CheckExecutionEvidenceUnsigned = {
    schemaVersion: 1,
    requirementId: input.requirement.id,
    checkId: input.requirement.checkId,
    kind: 'check-report',
    path: input.requirement.path,
    source: Object.freeze({ headSha: input.headSha, planId: input.planId }),
    producer: Object.freeze({
      checkId: input.requirement.checkId,
      command: input.requirement.command,
      verifier: input.requirement.verifier,
      identity: Object.freeze({ ...input.identity }),
      jobs,
      platforms,
    }),
    result: resultFor(jobs),
  };
  return Object.freeze({ ...unsigned, evidenceId: digest(unsigned) });
}

/** Rebuild an addressed execution record and reject any altered field. */
export function parseCheckExecutionEvidence(value: unknown): CheckExecutionEvidence {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('check execution evidence must be an object');
  }
  exactKeys(
    value,
    ['schemaVersion', 'requirementId', 'checkId', 'kind', 'path', 'source', 'producer', 'result', 'evidenceId'],
    'check execution evidence',
  );
  const candidate = value as Partial<CheckExecutionEvidence>;
  if (
    candidate.schemaVersion !== 1 ||
    typeof candidate.requirementId !== 'string' ||
    typeof candidate.checkId !== 'string' ||
    candidate.kind !== 'check-report' ||
    typeof candidate.path !== 'string' ||
    typeof candidate.source !== 'object' ||
    candidate.source === null ||
    typeof candidate.producer !== 'object' ||
    candidate.producer === null ||
    typeof candidate.result !== 'object' ||
    candidate.result === null ||
    typeof candidate.evidenceId !== 'string'
  ) {
    throw new TypeError('check execution evidence envelope is invalid');
  }
  const source = candidate.source as CheckExecutionEvidence['source'];
  const producer = candidate.producer as CheckExecutionEvidence['producer'];
  const result = candidate.result as CheckExecutionEvidence['result'];
  exactKeys(source, ['headSha', 'planId'], 'check execution source');
  exactKeys(producer, ['checkId', 'command', 'verifier', 'identity', 'jobs', 'platforms'], 'check execution producer');
  exactKeys(producer.identity, ['repository', 'workflow', 'runId', 'runAttempt'], 'check execution identity');
  exactKeys(result, ['verdict', 'durationMs', 'cacheHit', 'findings'], 'check execution result');
  if (!Array.isArray(producer.jobs) || !Array.isArray(producer.platforms) || !Array.isArray(result.findings)) {
    throw new TypeError('check execution evidence arrays are invalid');
  }
  if (producer.verifier !== 'delivery-evidence/check-report-v1') {
    throw new TypeError('check execution evidence verifier is invalid');
  }
  for (const observed of producer.jobs) {
    if (observed === null || typeof observed !== 'object' || Array.isArray(observed)) {
      throw new TypeError('check execution job must be an object');
    }
    exactKeys(observed, ['name', 'conclusion', 'startedAt', 'completedAt', 'runAttempt'], 'check execution job');
  }
  const rebuilt = buildCheckExecutionEvidence({
    requirement: {
      id: candidate.requirementId,
      kind: candidate.kind,
      path: candidate.path,
      producer: candidate.checkId,
      requiredConditions: [
        'head-sha-match',
        'plan-id-match',
        'platform-match',
        'producer-match',
        'command-match',
        'verdict-pass',
        'digest-match',
      ],
      verifier: 'delivery-evidence/check-report-v1',
      checkId: candidate.checkId,
      command: producer.command,
      authority: 'blocking',
      profiles: [],
    },
    headSha: source.headSha,
    planId: source.planId,
    identity: producer.identity,
    jobs: producer.jobs,
    platforms: producer.platforms,
  });
  if (
    rebuilt.evidenceId !== candidate.evidenceId ||
    rebuilt.result.verdict !== result.verdict ||
    rebuilt.result.durationMs !== result.durationMs ||
    rebuilt.result.cacheHit !== result.cacheHit ||
    stableJson(rebuilt.result.findings) !== stableJson(result.findings)
  ) {
    throw new TypeError('check execution evidence identity or result mismatch');
  }
  return rebuilt;
}

/** Canonical bytes used for file persistence and raw manifest digesting. */
export function serializeCheckExecutionEvidence(evidence: CheckExecutionEvidence): string {
  return `${JSON.stringify(evidence, null, 2)}\n`;
}
