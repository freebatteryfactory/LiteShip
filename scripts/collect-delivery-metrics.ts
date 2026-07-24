/** Collect workflow timings from GitHub and fold them through the deterministic metrics kernel. */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { CheckReport } from '../packages/command/src/checks/plan.js';
import {
  buildCheckExecutionEvidence,
  serializeCheckExecutionEvidence,
  type ObservedGithubJob,
} from './lib/check-execution-evidence.js';
import { buildCiAuthorityEvidence, serializeCiAuthorityEvidence } from './lib/ci-authority-evidence.js';
import { requiredAuthorityJobs } from './lib/ci-authority.js';
import { jobNameMatches, selectCheckEvidence, type DeliveryCiEvent } from './lib/ci-evidence-selection.js';
import {
  admitGitHubChangeIntent,
  type GitHubChangeIntentEvent,
  type GitHubRepositoryPermission,
} from './lib/github-change-intent.js';
import { buildGovernedExceptionView } from './lib/governed-exceptions.js';
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
const workflow = requireEnv('GITHUB_WORKFLOW');
const rawEventName = requireEnv('GITHUB_EVENT_NAME');
const admittedEvents = new Set<DeliveryCiEvent>([
  'pull_request',
  'push',
  'schedule',
  'workflow_dispatch',
  'workflow_call',
]);
if (!admittedEvents.has(rawEventName as DeliveryCiEvent)) {
  throw new TypeError(`unsupported delivery evidence event ${rawEventName}`);
}
const eventName = rawEventName as DeliveryCiEvent;
const headSha = requireEnv('GITHUB_SHA');
const runAttempt = requireEnv('GITHUB_RUN_ATTEMPT');
const ref = requireEnv('GITHUB_REF');
const planPath = process.argv[2] ?? '.liteship/affected-plan.json';
const outputPath = process.argv[3] ?? 'reports/delivery-metrics.json';
const selectorCalibrationPath = process.argv[4] ?? '.liteship/affected-selector-calibration.json';
const flakeEvidencePath = process.argv[5] ?? 'reports/flake-evidence.json';
const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' };
const runResponse = await fetch(`https://api.github.com/repos/${repository}/actions/runs/${runId}`, { headers });
if (!runResponse.ok) throw new Error(`GitHub run API returned ${runResponse.status}`);
const run = (await runResponse.json()) as {
  created_at?: string;
  actor?: { login?: string };
  triggering_actor?: { login?: string };
  pull_requests?: readonly { number?: number }[];
};
if (typeof run.created_at !== 'string') throw new Error('GitHub run API returned no creation time');
const allJobs: GithubJob[] = [];
for (let page = 1; ; page += 1) {
  const response = await fetch(
    `https://api.github.com/repos/${repository}/actions/runs/${runId}/attempts/${runAttempt}/jobs?per_page=100&page=${page}`,
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

async function githubJson<T>(path: string): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, { headers });
  if (!response.ok) throw new Error(`GitHub API ${path} returned ${response.status}`);
  return (await response.json()) as T;
}

const [repositoryOwner, repositoryName] = repository.split('/');
if (!repositoryOwner || !repositoryName || repository.split('/').length !== 2) {
  throw new TypeError(`GITHUB_REPOSITORY is malformed: ${repository}`);
}
const repositoryFacts = await githubJson<{ node_id?: string }>(`/repos/${repository}`);
if (typeof repositoryFacts.node_id !== 'string' || repositoryFacts.node_id.length === 0) {
  throw new TypeError('GitHub repository API returned no node_id');
}
let intentBody: string | null = null;
let sponsorLogin = run.triggering_actor?.login ?? run.actor?.login;
let intentEvent: GitHubChangeIntentEvent = ref.startsWith('refs/tags/') ? 'tag' : 'push';
let pullNumber = run.pull_requests?.find((candidate) => Number.isInteger(candidate.number))?.number;
if (eventName === 'pull_request') {
  intentEvent = 'pull-request';
} else if (pullNumber === undefined) {
  const associated = await githubJson<readonly { number?: number }[]>(`/repos/${repository}/commits/${headSha}/pulls`);
  pullNumber = associated.find((candidate) => Number.isInteger(candidate.number))?.number;
}
if (pullNumber !== undefined) {
  const pull = await githubJson<{ body?: string | null; user?: { login?: string } }>(
    `/repos/${repository}/pulls/${pullNumber}`,
  );
  intentBody = pull.body ?? null;
  sponsorLogin = pull.user?.login ?? sponsorLogin;
}
if (typeof sponsorLogin !== 'string' || sponsorLogin.length === 0) {
  throw new TypeError('GitHub supplied no sponsor identity for change intent');
}
const permissionFacts = await githubJson<{ permission?: string }>(
  `/repos/${repository}/collaborators/${encodeURIComponent(sponsorLogin)}/permission`,
);
const permission = permissionFacts.permission;
if (!['admin', 'maintain', 'write', 'triage', 'read', 'none'].includes(String(permission))) {
  throw new TypeError(`GitHub returned unsupported repository permission ${String(permission)}`);
}
const admittedIntent = admitGitHubChangeIntent({
  event: intentEvent,
  body: intentBody,
  sourceSha: headSha,
  repository: { owner: repositoryOwner, name: repositoryName, nodeId: repositoryFacts.node_id },
  actor: { login: sponsorLogin, permission: permission as GitHubRepositoryPermission },
});
mkdirSync('reports', { recursive: true });
writeFileSync('reports/change-intent.json', `${JSON.stringify(admittedIntent, null, 2)}\n`, 'utf8');
const governedExceptions = await buildGovernedExceptionView(process.cwd(), new Date());
writeFileSync('reports/governed-exceptions.json', `${JSON.stringify(governedExceptions, null, 2)}\n`, 'utf8');

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
if (plan.headSha !== headSha)
  throw new TypeError(`affected plan head ${plan.headSha} does not match GITHUB_SHA ${headSha}`);
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
const selected = selectCheckEvidence(plan, eventName);
const evidenceRecords = selected.map((selection) => {
  const matched: ObservedGithubJob[] = [];
  for (const expected of selection.jobNames) {
    const observed = jobs.filter((job) => jobNameMatches(job.name, expected));
    if (observed.length === 0) throw new TypeError(`GitHub run contains no completed evidence job for ${expected}`);
    matched.push(
      ...observed.map((job) => ({
        name: job.name,
        conclusion: job.conclusion,
        startedAt: job.started_at,
        completedAt: job.completed_at,
        runAttempt: job.run_attempt,
      })),
    );
  }
  return buildCheckExecutionEvidence({
    requirement: selection.requirement,
    headSha,
    planId: plan.planId,
    identity: { repository, workflow, runId, runAttempt },
    jobs: matched,
    platforms: selection.platforms,
  });
});

for (const evidence of evidenceRecords) {
  mkdirSync(dirname(evidence.path), { recursive: true });
  writeFileSync(evidence.path, serializeCheckExecutionEvidence(evidence), 'utf8');
}

const report: CheckReport = {
  profile: eventName === 'pull_request' ? 'quick' : 'release',
  platform: 'linux',
  context: 'repository',
  ok: evidenceRecords.length > 0 && evidenceRecords.every((evidence) => evidence.result.verdict === 'pass'),
  blocked: evidenceRecords.some((evidence) => evidence.result.verdict === 'fail'),
  results: evidenceRecords.map((evidence) => ({ id: evidence.checkId, ...evidence.result })),
  curePackets: [],
};
const reports: readonly CheckReport[] = [report];
const reportPath = 'reports/check-reports.json';
mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(reports, null, 2)}\n`, 'utf8');

const authorityJobs = requiredAuthorityJobs({ event: eventName, ref, browserAffected: plan.browserRequired });
const observedAuthorityJobs = jobs
  .filter((job) => authorityJobs.some((required) => jobNameMatches(job.name, required)))
  .map((job) => ({
    name: job.name,
    conclusion: job.conclusion,
    startedAt: job.started_at,
    completedAt: job.completed_at,
    runAttempt: job.run_attempt,
  }));
const authorityEvidence = buildCiAuthorityEvidence({
  identity: { repository, workflow, runId, runAttempt, event: eventName, ref, headSha },
  requiredJobs: authorityJobs,
  jobs: observedAuthorityJobs,
});
const authorityPath = 'reports/ci-authority.json';
writeFileSync(authorityPath, serializeCiAuthorityEvidence(authorityEvidence), 'utf8');

const metrics = buildDeliveryMetrics({
  plan,
  reports,
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
  requiredEvidence: selected.length,
  presentEvidence: evidenceRecords.length,
  escapedDefects: null,
  artifactMismatches: null,
  selectorMisses: selectorCalibration?.selectorMisses ?? null,
  flakeEvidenceId: flakeEvidence?.evidenceId ?? null,
});
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(metrics, null, 2)}\n`, 'utf8');
process.stdout.write(`${metrics.metricsId} ${metrics.verdict}\n`);
