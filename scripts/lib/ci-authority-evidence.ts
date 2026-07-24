/** Addressed GitHub job observation for the event-specific final authority fold. @module */

import { createHash } from 'node:crypto';
import type { ObservedGithubJob } from './check-execution-evidence.js';
import { jobNameMatches } from './ci-evidence-selection.js';

function exactKeys(value: object, expected: readonly string[], label: string): void {
  const actual = Reflect.ownKeys(value);
  if (actual.some((key) => typeof key !== 'string')) throw new TypeError(`${label} contains a symbol key`);
  const left = (actual as string[]).sort();
  const right = [...expected].sort();
  if (left.length !== right.length || left.some((key, index) => key !== right[index])) {
    throw new TypeError(`${label} keys must be exactly ${right.join(', ')}`);
  }
}

export interface CiAuthorityEvidenceUnsigned {
  readonly schemaVersion: 1;
  readonly identity: {
    readonly repository: string;
    readonly workflow: string;
    readonly runId: string;
    readonly runAttempt: string;
    readonly event: string;
    readonly ref: string;
    readonly headSha: string;
  };
  readonly requiredJobs: readonly string[];
  readonly jobs: readonly ObservedGithubJob[];
  readonly verdict: 'accepted' | 'rejected';
  readonly findings: readonly string[];
}

export interface CiAuthorityEvidence extends CiAuthorityEvidenceUnsigned {
  readonly evidenceId: `sha256:${string}`;
}

function stable(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stable(record[key])}`)
    .join(',')}}`;
}

function digest(value: CiAuthorityEvidenceUnsigned): `sha256:${string}` {
  return `sha256:${createHash('sha256').update(stable(value), 'utf8').digest('hex')}`;
}

function sortedUnique(values: readonly string[], label: string): readonly string[] {
  const normalized = values.map((value) => {
    if (value.trim() !== value || value.length === 0) throw new TypeError(`${label} contains an invalid value`);
    return value;
  });
  if (new Set(normalized).size !== normalized.length) throw new TypeError(`${label} contains duplicates`);
  return Object.freeze([...normalized].sort());
}

/** Fold required job identities over GitHub-observed conclusions without treating skips as success. */
export function buildCiAuthorityEvidence(input: {
  readonly identity: CiAuthorityEvidenceUnsigned['identity'];
  readonly requiredJobs: readonly string[];
  readonly jobs: readonly ObservedGithubJob[];
}): CiAuthorityEvidence {
  if (!/^[0-9a-f]{40}$/u.test(input.identity.headSha)) throw new TypeError('CI authority headSha is invalid');
  for (const [key, value] of Object.entries(input.identity)) {
    if (value.trim() !== value || value.length === 0) throw new TypeError(`CI authority identity.${key} is invalid`);
  }
  const requiredJobs = sortedUnique(input.requiredJobs, 'requiredJobs');
  if (requiredJobs.length === 0) throw new TypeError('CI authority requires at least one job');
  const seenJobs = new Set<string>();
  const jobs = Object.freeze(
    [...input.jobs]
      .map((job) => {
        if (job.name.trim() !== job.name || job.name.length === 0)
          throw new TypeError('CI authority job name is invalid');
        if (!Number.isFinite(Date.parse(job.startedAt)) || !Number.isFinite(Date.parse(job.completedAt))) {
          throw new TypeError(`CI authority job ${job.name} has invalid timestamps`);
        }
        if (Date.parse(job.completedAt) < Date.parse(job.startedAt)) {
          throw new TypeError(`CI authority job ${job.name} completes before it starts`);
        }
        if (!Number.isInteger(job.runAttempt) || job.runAttempt < 1) {
          throw new TypeError(`CI authority job ${job.name} has an invalid run attempt`);
        }
        const key = `${job.name}\0${job.runAttempt}`;
        if (seenJobs.has(key)) throw new TypeError(`duplicate CI authority job attempt ${job.name}`);
        seenJobs.add(key);
        return Object.freeze({ ...job });
      })
      .sort((left, right) => left.name.localeCompare(right.name) || left.runAttempt - right.runAttempt),
  );
  const findings: string[] = [];
  for (const required of requiredJobs) {
    const matched = jobs.filter((job) => jobNameMatches(job.name, required));
    if (matched.length === 0) findings.push(`${required}: missing`);
    else
      for (const job of matched)
        if (job.conclusion !== 'success') findings.push(`${job.name}: ${job.conclusion ?? 'incomplete'}`);
  }
  const unsigned: CiAuthorityEvidenceUnsigned = {
    schemaVersion: 1,
    identity: Object.freeze({ ...input.identity }),
    requiredJobs,
    jobs,
    verdict: findings.length === 0 ? 'accepted' : 'rejected',
    findings: Object.freeze(findings.sort()),
  };
  return Object.freeze({ ...unsigned, evidenceId: digest(unsigned) });
}

/** Verify one serialized authority observation by rebuilding its exact addressed fold. */
export function parseCiAuthorityEvidence(value: unknown): CiAuthorityEvidence {
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    throw new TypeError('CI authority evidence must be an object');
  exactKeys(
    value,
    ['schemaVersion', 'identity', 'requiredJobs', 'jobs', 'verdict', 'findings', 'evidenceId'],
    'CI authority evidence',
  );
  const candidate = value as Partial<CiAuthorityEvidence>;
  if (
    candidate.schemaVersion !== 1 ||
    typeof candidate.identity !== 'object' ||
    candidate.identity === null ||
    !Array.isArray(candidate.requiredJobs) ||
    !Array.isArray(candidate.jobs) ||
    !Array.isArray(candidate.findings) ||
    typeof candidate.evidenceId !== 'string'
  ) {
    throw new TypeError('CI authority evidence envelope is invalid');
  }
  exactKeys(
    candidate.identity,
    ['repository', 'workflow', 'runId', 'runAttempt', 'event', 'ref', 'headSha'],
    'CI authority identity',
  );
  for (const observed of candidate.jobs) {
    if (observed === null || typeof observed !== 'object' || Array.isArray(observed)) {
      throw new TypeError('CI authority job must be an object');
    }
    exactKeys(observed, ['name', 'conclusion', 'startedAt', 'completedAt', 'runAttempt'], 'CI authority job');
  }
  const rebuilt = buildCiAuthorityEvidence({
    identity: candidate.identity as CiAuthorityEvidenceUnsigned['identity'],
    requiredJobs: candidate.requiredJobs,
    jobs: candidate.jobs,
  });
  if (
    rebuilt.evidenceId !== candidate.evidenceId ||
    rebuilt.verdict !== candidate.verdict ||
    stable(rebuilt.findings) !== stable(candidate.findings)
  ) {
    throw new TypeError('CI authority evidence identity or verdict mismatch');
  }
  return rebuilt;
}

export function serializeCiAuthorityEvidence(value: CiAuthorityEvidence): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
