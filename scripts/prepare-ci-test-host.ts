/**
 * Prepare one CI test host from canonical capability and standards-base laws.
 *
 * The script is intentionally cross-platform and cold-checkout-safe. It
 * installs ffmpeg only when the same libx264 encode probe used by scene render
 * fails, and it fetches only the exact independent standards baseline needed
 * by this event. Successful preparation emits a bounded JSON receipt.
 *
 * Every child process carries a hard budget and every phase emits start/end
 * records to stderr (scar for CI run 30382383876, where one unbounded child
 * consumed a full 30-minute shard). A probe timeout refuses preparation
 * without provisioning: a hung ffmpeg is a wedged host, not a missing binary.
 *
 * @module
 */

import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { ffmpegProbeTimedOut, probeFfmpegRender } from '../packages/command/src/host/ffmpeg-probe.js';
import { spawnArgvCaptureWithEnv } from '../packages/command/src/host/launcher.js';
import {
  ffmpegInstallPlan,
  ffmpegPostInstallPathProjection,
  hostPreparationBudgets,
  remainingPhaseBudgetMs,
  standardsBaseTarget,
} from './lib/ci-test-host-contract.js';

const args = new Set(process.argv.slice(2));
const prepareFfmpeg = args.has('--ffmpeg');
const prepareStandards = args.has('--standards-base');
if (!prepareFfmpeg && !prepareStandards) {
  throw new Error('prepare-ci-test-host requires --ffmpeg and/or --standards-base');
}

const budgets = hostPreparationBudgets(process.env);

function phaseRecord(phase: string, event: 'start' | 'end' | 'failed', durationMs?: number): void {
  const record = { ciTestHostPhase: phase, event, ...(durationMs === undefined ? {} : { durationMs }) };
  process.stderr.write(`${JSON.stringify(record)}\n`);
}

async function runPhase<T>(phase: string, work: () => Promise<T> | T): Promise<T> {
  const started = Date.now();
  phaseRecord(phase, 'start');
  try {
    const value = await work();
    phaseRecord(phase, 'end', Date.now() - started);
    return value;
  } catch (error) {
    phaseRecord(phase, 'failed', Date.now() - started);
    throw error;
  }
}

async function run(command: string, commandArgs: readonly string[], timeoutMs: number): Promise<void> {
  const result = await spawnArgvCaptureWithEnv(command, commandArgs, { cwd: process.cwd(), timeoutMs });
  const tail = (result.stderr || result.stdout).slice(-2000);
  if (result.timedOut) {
    throw new Error(`${command} ${commandArgs.join(' ')} timed out after ${timeoutMs}ms: ${tail}`);
  }
  if (result.exitCode !== 0) {
    throw new Error(`${command} ${commandArgs.join(' ')} exited ${result.exitCode}: ${tail}`);
  }
}

async function gitHasSnapshot(ref: string): Promise<boolean> {
  const result = await spawnArgvCaptureWithEnv(
    'git',
    ['cat-file', '-e', `${ref}:traceability/standards-snapshot.json`],
    { cwd: process.cwd(), timeoutMs: budgets.fetchTimeoutMs },
  );
  if (result.timedOut) {
    throw new Error(`git cat-file for ${ref} timed out after ${budgets.fetchTimeoutMs}ms`);
  }
  return result.exitCode === 0;
}

let standardsBaseRef: string | undefined;
if (prepareStandards) {
  standardsBaseRef = await runPhase('standards-base', async () => {
    const target = standardsBaseTarget({
      baseSha: process.env.LITESHIP_CI_BASE_SHA,
      baseRef: process.env.LITESHIP_CI_BASE_REF,
    });
    if (!(await gitHasSnapshot(target.ref))) await run('git', target.fetchArgs, budgets.fetchTimeoutMs);
    if (!(await gitHasSnapshot(target.ref))) {
      throw new Error(
        `standards base ${target.ref} does not contain traceability/standards-snapshot.json after bounded fetch`,
      );
    }
    return target.ref;
  });
  process.env.LITESHIP_STANDARDS_BASE_REF = standardsBaseRef;
  const githubEnv = process.env.GITHUB_ENV;
  if (githubEnv !== undefined && githubEnv !== '') {
    await appendFile(githubEnv, `LITESHIP_STANDARDS_BASE_REF=${standardsBaseRef}\n`, 'utf8');
  }
}

function refuseTimedOutProbe(probe: ReturnType<typeof probeFfmpegRender>): void {
  if (ffmpegProbeTimedOut(probe)) {
    throw new Error(
      `ffmpeg host preparation refused: ${probe.detail}; ${probe.hint ?? 'no hint'} ` +
        '(a probe timeout is not evidence that ffmpeg is missing, so no install was attempted)',
    );
  }
}

let ffmpegDetail: string | undefined;
if (prepareFfmpeg) {
  let probe = await runPhase('ffmpeg-probe', () => probeFfmpegRender());
  refuseTimedOutProbe(probe);
  if (!probe.ok) {
    await runPhase('ffmpeg-install', async () => {
      // One deadline for the WHOLE plan: each step spawns with only the time
      // remaining, so a two-step linux plan cannot consume two full budgets.
      const deadline = Date.now() + budgets.installPhaseTimeoutMs;
      for (const step of ffmpegInstallPlan(process.platform)) {
        await run(step.command, step.args, remainingPhaseBudgetMs(deadline, Date.now()));
      }
    });
    const pathProjection = ffmpegPostInstallPathProjection(
      process.platform,
      process.env.PATH,
      process.env.ChocolateyInstall,
    );
    process.env.PATH = pathProjection.processPath;
    const githubPath = process.env.GITHUB_PATH;
    if (pathProjection.githubPathEntry !== undefined && githubPath !== undefined && githubPath !== '') {
      await appendFile(githubPath, `${pathProjection.githubPathEntry}\n`, 'utf8');
    }
    probe = await runPhase('ffmpeg-postinstall-probe', () => probeFfmpegRender());
    refuseTimedOutProbe(probe);
  }
  if (!probe.ok) throw new Error(`ffmpeg host preparation failed: ${probe.detail}; ${probe.hint ?? 'no hint'}`);
  ffmpegDetail = probe.detail;
}

await mkdir('reports', { recursive: true });
const receipt = {
  schema: 'liteship/ci-test-host@1',
  platform: process.platform,
  ...(standardsBaseRef === undefined ? {} : { standardsBaseRef }),
  ...(ffmpegDetail === undefined ? {} : { ffmpeg: { ok: true, detail: ffmpegDetail } }),
};
await writeFile('reports/ci-test-host.json', `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify(receipt)}\n`);
