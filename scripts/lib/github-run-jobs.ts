/** Strict GitHub Actions job observation for delivery evidence admission. @module */

import type { ObservedGithubJob } from './check-execution-evidence.js';

interface GithubJobPayload {
  readonly name?: unknown;
  readonly status?: unknown;
  readonly conclusion?: unknown;
  readonly started_at?: unknown;
  readonly completed_at?: unknown;
  readonly run_attempt?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nullableTimestamp(value: unknown, jobName: string): string | null {
  if (value === null) return null;
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.trim() !== value ||
    !Number.isFinite(Date.parse(value))
  ) {
    throw new TypeError(`GitHub returned malformed completed job ${jobName}`);
  }
  return value;
}

interface GithubJobsPayload {
  readonly total_count?: unknown;
  readonly jobs?: unknown;
}

export interface FetchGithubRunJobsInput {
  readonly repository: string;
  readonly runId: string;
  readonly runAttempt: string;
  readonly token: string;
  readonly fetchImpl?: typeof fetch;
}

function requirePositiveInteger(value: string, label: string): void {
  if (!/^[1-9][0-9]*$/u.test(value)) throw new TypeError(`${label} must be a positive integer`);
}

/** Fetch exact completed jobs for one run attempt; in-progress jobs are not evidence. */
export async function fetchCompletedGithubRunJobs(
  input: FetchGithubRunJobsInput,
): Promise<readonly ObservedGithubJob[]> {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(input.repository)) {
    throw new TypeError('GitHub repository is invalid');
  }
  requirePositiveInteger(input.runId, 'GitHub run id');
  requirePositiveInteger(input.runAttempt, 'GitHub run attempt');
  if (input.token.length === 0) throw new TypeError('GitHub token is required');
  const fetchImpl = input.fetchImpl ?? fetch;
  const headers = { Authorization: `Bearer ${input.token}`, Accept: 'application/vnd.github+json' };
  const raw: unknown[] = [];
  for (let page = 1; ; page += 1) {
    const response = await fetchImpl(
      `https://api.github.com/repos/${input.repository}/actions/runs/${input.runId}/attempts/${input.runAttempt}/jobs?per_page=100&page=${page}`,
      { headers },
    );
    if (!response.ok) throw new Error(`GitHub jobs API returned ${response.status}`);
    const body = (await response.json()) as GithubJobsPayload;
    if (!Array.isArray(body.jobs)) throw new TypeError('GitHub jobs API returned no jobs array');
    raw.push(...body.jobs);
    if (typeof body.total_count !== 'number' || !Number.isInteger(body.total_count) || body.total_count < 0) {
      throw new TypeError('GitHub jobs API total_count is invalid');
    }
    if (raw.length >= body.total_count) break;
    if (body.jobs.length === 0) throw new Error(`GitHub jobs API stopped at ${raw.length}/${body.total_count} jobs`);
  }
  const seen = new Set<string>();
  const completed = raw
    .map((value): ObservedGithubJob | null => {
      if (!isRecord(value)) throw new TypeError('GitHub returned malformed job');
      const job = value as GithubJobPayload;
      if (
        typeof job.name !== 'string' ||
        job.name.trim() !== job.name ||
        job.name.length === 0 ||
        typeof job.status !== 'string' ||
        job.status.trim() !== job.status ||
        job.status.length === 0 ||
        typeof job.run_attempt !== 'number' ||
        !Number.isInteger(job.run_attempt) ||
        job.run_attempt < 1 ||
        (job.conclusion !== null && typeof job.conclusion !== 'string')
      ) {
        throw new TypeError(`GitHub returned malformed job ${typeof job.name === 'string' ? job.name : '(unknown)'}`);
      }
      if (job.run_attempt !== Number(input.runAttempt)) {
        throw new TypeError(`GitHub returned foreign attempt for ${job.name}`);
      }
      const identity = `${job.name}\0${job.run_attempt}`;
      if (seen.has(identity)) throw new TypeError(`GitHub returned duplicate job ${job.name}`);
      seen.add(identity);
      if (job.status !== 'completed') return null;
      if (
        typeof job.conclusion !== 'string' ||
        job.conclusion.trim() !== job.conclusion ||
        job.conclusion.length === 0
      ) {
        throw new TypeError(`GitHub returned malformed completed job ${job.name}`);
      }
      const startedAt = nullableTimestamp(job.started_at, job.name);
      const completedAt = nullableTimestamp(job.completed_at, job.name);
      if (startedAt !== null && completedAt !== null && Date.parse(completedAt) < Date.parse(startedAt)) {
        throw new TypeError(`GitHub returned malformed completed job ${job.name}`);
      }
      return Object.freeze({
        name: job.name,
        conclusion: job.conclusion,
        startedAt,
        completedAt,
        runAttempt: job.run_attempt,
      });
    })
    .filter((job): job is ObservedGithubJob => job !== null)
    .sort((left, right) => left.name.localeCompare(right.name));
  if (completed.length === 0) throw new Error('GitHub jobs API returned no completed jobs');
  return Object.freeze(completed);
}
