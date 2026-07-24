/** Strict GitHub Actions job observation for delivery evidence admission. @module */

import type { ObservedGithubJob } from './check-execution-evidence.js';

interface GithubJobPayload {
  readonly name?: unknown;
  readonly conclusion?: unknown;
  readonly started_at?: unknown;
  readonly completed_at?: unknown;
  readonly run_attempt?: unknown;
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
  const raw: GithubJobPayload[] = [];
  for (let page = 1; ; page += 1) {
    const response = await fetchImpl(
      `https://api.github.com/repos/${input.repository}/actions/runs/${input.runId}/attempts/${input.runAttempt}/jobs?per_page=100&page=${page}`,
      { headers },
    );
    if (!response.ok) throw new Error(`GitHub jobs API returned ${response.status}`);
    const body = (await response.json()) as GithubJobsPayload;
    if (!Array.isArray(body.jobs)) throw new TypeError('GitHub jobs API returned no jobs array');
    raw.push(...(body.jobs as GithubJobPayload[]));
    if (typeof body.total_count !== 'number' || !Number.isInteger(body.total_count) || body.total_count < 0) {
      throw new TypeError('GitHub jobs API total_count is invalid');
    }
    if (raw.length >= body.total_count) break;
    if (body.jobs.length === 0) throw new Error(`GitHub jobs API stopped at ${raw.length}/${body.total_count} jobs`);
  }
  const completed = raw
    .filter(
      (
        job,
      ): job is GithubJobPayload & {
        readonly name: string;
        readonly started_at: string;
        readonly completed_at: string;
        readonly run_attempt: number;
      } =>
        typeof job.name === 'string' &&
        typeof job.started_at === 'string' &&
        typeof job.completed_at === 'string' &&
        typeof job.run_attempt === 'number',
    )
    .map((job) => {
      if (job.run_attempt !== Number(input.runAttempt))
        throw new TypeError(`GitHub returned foreign attempt for ${job.name}`);
      if (
        job.name.trim() !== job.name ||
        job.name.length === 0 ||
        !Number.isFinite(Date.parse(job.started_at)) ||
        !Number.isFinite(Date.parse(job.completed_at)) ||
        Date.parse(job.completed_at) < Date.parse(job.started_at) ||
        (job.conclusion !== null && typeof job.conclusion !== 'string')
      ) {
        throw new TypeError(`GitHub returned malformed completed job ${job.name}`);
      }
      return Object.freeze({
        name: job.name,
        conclusion: job.conclusion as string | null,
        startedAt: job.started_at,
        completedAt: job.completed_at,
        runAttempt: job.run_attempt,
      });
    })
    .sort((left, right) => left.name.localeCompare(right.name));
  if (completed.length === 0) throw new Error('GitHub jobs API returned no completed jobs');
  const seen = new Set<string>();
  for (const job of completed) {
    const id = `${job.name}\0${job.runAttempt}`;
    if (seen.has(id)) throw new TypeError(`GitHub returned duplicate completed job ${job.name}`);
    seen.add(id);
  }
  return Object.freeze(completed);
}
