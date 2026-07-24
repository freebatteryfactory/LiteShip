/** Collect workflow timings from GitHub and fold them through the deterministic metrics kernel. */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { buildDeliveryMetrics } from './lib/delivery-metrics.js';
import { parseAffectedTestPlan } from './lib/affected-test-plan.js';
import { parseAffectedSelectorCalibration } from './lib/affected-selector-calibration.js';
import { assertFlakeEvidenceCurrent, parseFlakeEvidence } from './lib/flake-evidence.js';
import { FLAKE_TARGETS } from './test-flake-targets.js';

interface GithubJob {
  readonly name: string;
  readonly status: string;
  readonly conclusion: string | null;
  readonly started_at: string | null;
  readonly completed_at: string | null;
  readonly run_attempt: number;
}

interface GithubJobsResponse {
  readonly total_count?: number;
  readonly jobs?: readonly GithubJob[];
}

const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new TypeError(`${name} is required`);
  return value;
};

const repository = requireEnv('GITHUB_REPOSITORY');
const runId = requireEnv('GITHUB_RUN_ID');
const token = requireEnv('GH_TOKEN');
const planPath = process.argv[2] ?? '.liteship/affected-plan.json';
const outputPath = process.argv[3] ?? 'reports/delivery-metrics.json';
const selectorCalibrationPath = process.argv[4] ?? '.liteship/affected-selector-calibration.json';
const flakeEvidencePath = process.argv[5] ?? 'reports/flake-evidence.json';
const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' };
const runResponse = await fetch(`https://api.github.com/repos/${repository}/actions/runs/${runId}`, { headers });
if (!runResponse.ok) throw new Error(`GitHub run API returned ${runResponse.status}`);
const run = (await runResponse.json()) as { created_at?: string };
if (typeof run.created_at !== 'string') throw new Error('GitHub run API returned no creation time');
const allJobs: GithubJob[] = [];
for (let page = 1; ; page += 1) {
  const response = await fetch(
    `https://api.github.com/repos/${repository}/actions/runs/${runId}/jobs?per_page=100&page=${page}`,
    { headers },
  );
  if (!response.ok) throw new Error(`GitHub jobs API returned ${response.status}`);
  const body = (await response.json()) as GithubJobsResponse;
  if (!Array.isArray(body.jobs)) throw new Error('GitHub jobs API returned no jobs array');
  allJobs.push(...body.jobs);
  const total = typeof body.total_count === 'number' ? body.total_count : allJobs.length;
  if (allJobs.length >= total) break;
  if (body.jobs.length === 0) throw new Error(`GitHub jobs API stopped at ${allJobs.length}/${total} jobs`);
}
if (allJobs.length === 0) throw new Error('GitHub jobs API returned no jobs');

const jobs = allJobs.filter(
  (job): job is GithubJob & { started_at: string; completed_at: string } =>
    typeof job.started_at === 'string' && typeof job.completed_at === 'string',
);
if (jobs.length === 0) throw new Error('GitHub jobs API returned no completed timing evidence');
const elapsed = (job: GithubJob): number =>
  Math.max(0, Date.parse(job.completed_at ?? job.started_at ?? '') - Date.parse(job.started_at ?? ''));
const runCreatedMs = Date.parse(run.created_at);
const firstStart = Math.min(...jobs.map((job) => Date.parse(job.started_at)));
const lastCompletion = Math.max(...jobs.map((job) => Date.parse(job.completed_at ?? job.started_at)));
const testJobs = jobs.filter((job) => /test|browser|smoke|gauntlet|mutation|mcdc|consumer|hermetic/iu.test(job.name));
const buildJobs = jobs.filter((job) => /build|setup|rust|wasm|package/iu.test(job.name));
const plan = parseAffectedTestPlan(JSON.parse(readFileSync(planPath, 'utf8')) as unknown);
const selectorCalibration = existsSync(selectorCalibrationPath)
  ? parseAffectedSelectorCalibration(JSON.parse(readFileSync(selectorCalibrationPath, 'utf8')) as unknown)
  : null;
if (selectorCalibration !== null && selectorCalibration.calibrationId !== plan.selectorCalibrationId) {
  throw new TypeError('selector calibration does not belong to the affected plan');
}
const flakeEvidence = existsSync(flakeEvidencePath)
  ? parseFlakeEvidence(JSON.parse(readFileSync(flakeEvidencePath, 'utf8')) as unknown)
  : null;
if (flakeEvidence !== null) {
  assertFlakeEvidenceCurrent(flakeEvidence, {
    headSha: plan.headSha,
    targets: FLAKE_TARGETS,
    today: new Date().toISOString().slice(0, 10),
  });
}
const metrics = buildDeliveryMetrics({
  plan,
  reports: [],
  timings: {
    queueMs: Math.max(0, firstStart - runCreatedMs),
    feedbackLatencyMs: Math.max(0, lastCompletion - runCreatedMs),
    buildMs: buildJobs.reduce((sum, job) => sum + elapsed(job), 0),
    testMs: testJobs.reduce((sum, job) => sum + elapsed(job), 0),
    totalComputeMs: jobs.reduce((sum, job) => sum + elapsed(job), 0),
  },
  jobAttempts: allJobs.length,
  reruns: Math.max(0, Number(process.env['GITHUB_RUN_ATTEMPT'] ?? '1') - 1),
  knownFlakyReruns: flakeEvidence?.recoveredRetries ?? null,
  flakeAttempts: flakeEvidence?.attempts ?? null,
  // Job completion is not equivalent to addressed evidence completeness. The
  // evidence manifest must supply these counts; absence remains unknown.
  requiredEvidence: null,
  presentEvidence: null,
  escapedDefects: null,
  artifactMismatches: null,
  selectorMisses: selectorCalibration?.selectorMisses ?? null,
  flakeEvidenceId: flakeEvidence?.evidenceId ?? null,
});
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(metrics, null, 2)}\n`, 'utf8');
process.stdout.write(`${metrics.metricsId} ${metrics.verdict}\n`);
