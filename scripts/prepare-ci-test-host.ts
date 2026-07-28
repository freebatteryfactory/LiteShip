/**
 * Prepare one CI test host from canonical capability and standards-base laws.
 *
 * The script is intentionally cross-platform and cold-checkout-safe. It
 * installs ffmpeg only when the same libx264 encode probe used by scene render
 * fails, and it fetches only the exact independent standards baseline needed
 * by this event. Successful preparation emits a bounded JSON receipt.
 *
 * @module
 */

import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { probeFfmpegRender } from '../packages/command/src/host/ffmpeg-probe.js';
import { spawnArgvCaptureWithEnv } from '../packages/command/src/host/launcher.js';
import {
  ffmpegInstallPlan,
  ffmpegPostInstallPathProjection,
  standardsBaseTarget,
} from './lib/ci-test-host-contract.js';

const args = new Set(process.argv.slice(2));
const prepareFfmpeg = args.has('--ffmpeg');
const prepareStandards = args.has('--standards-base');
if (!prepareFfmpeg && !prepareStandards) {
  throw new Error('prepare-ci-test-host requires --ffmpeg and/or --standards-base');
}

async function run(command: string, commandArgs: readonly string[]): Promise<void> {
  const result = await spawnArgvCaptureWithEnv(command, commandArgs, { cwd: process.cwd() });
  if (result.exitCode !== 0) {
    throw new Error(
      `${command} ${commandArgs.join(' ')} exited ${result.exitCode}: ${(result.stderr || result.stdout).slice(-2000)}`,
    );
  }
}

async function gitHasSnapshot(ref: string): Promise<boolean> {
  const result = await spawnArgvCaptureWithEnv(
    'git',
    ['cat-file', '-e', `${ref}:traceability/standards-snapshot.json`],
    { cwd: process.cwd() },
  );
  return result.exitCode === 0;
}

let standardsBaseRef: string | undefined;
if (prepareStandards) {
  const target = standardsBaseTarget({
    baseSha: process.env.LITESHIP_CI_BASE_SHA,
    baseRef: process.env.LITESHIP_CI_BASE_REF,
  });
  if (!(await gitHasSnapshot(target.ref))) await run('git', target.fetchArgs);
  if (!(await gitHasSnapshot(target.ref))) {
    throw new Error(
      `standards base ${target.ref} does not contain traceability/standards-snapshot.json after bounded fetch`,
    );
  }
  standardsBaseRef = target.ref;
  process.env.LITESHIP_STANDARDS_BASE_REF = target.ref;
  const githubEnv = process.env.GITHUB_ENV;
  if (githubEnv !== undefined && githubEnv !== '') {
    await appendFile(githubEnv, `LITESHIP_STANDARDS_BASE_REF=${target.ref}\n`, 'utf8');
  }
}

let ffmpegDetail: string | undefined;
if (prepareFfmpeg) {
  let probe = probeFfmpegRender();
  if (!probe.ok) {
    for (const step of ffmpegInstallPlan(process.platform)) await run(step.command, step.args);
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
    probe = probeFfmpegRender();
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
