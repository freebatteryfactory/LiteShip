/** Pure policy for preparing cross-platform CI hosts that execute Node tests. @module */

import { win32 } from 'node:path';

export const ZERO_SHA = '0000000000000000000000000000000000000000';

export interface StandardsBaseInput {
  readonly baseSha?: string;
  readonly baseRef?: string;
}

export interface StandardsBaseTarget {
  readonly ref: string;
  readonly fetchArgs: readonly string[];
}

/**
 * Choose the exact independent standards baseline for this workflow event.
 * PR base SHA and push-before SHA win; first-push/manual events use the named
 * integration branch. The result is a ref plus the bounded fetch that can make
 * it available in a shallow checkout.
 */
export function standardsBaseTarget(input: StandardsBaseInput): StandardsBaseTarget {
  const sha = input.baseSha?.trim();
  if (sha !== undefined && sha !== '' && sha !== ZERO_SHA) {
    return Object.freeze({ ref: sha, fetchArgs: Object.freeze(['fetch', '--no-tags', '--depth=1', 'origin', sha]) });
  }
  const branch = input.baseRef?.trim() || 'main';
  return Object.freeze({
    ref: `origin/${branch}`,
    fetchArgs: Object.freeze(['fetch', '--no-tags', '--depth=1', 'origin', branch]),
  });
}

export interface HostCommand {
  readonly command: string;
  readonly args: readonly string[];
}

/** Chocolatey package whose stable archive layout the Windows PATH projection qualifies. */
export const WINDOWS_FFMPEG_CHOCOLATEY_VERSION = '8.1.2';

export interface FfmpegPostInstallPathProjection {
  readonly processPath: string;
  readonly githubPathEntry?: string;
}

/**
 * Project the path made available by a completed ffmpeg install.
 *
 * Chocolatey's ffmpeg package extracts the executable below its package tools
 * directory and does not mutate the already-running Node process. GitHub's
 * Windows runner therefore needs both an immediate process PATH update for the
 * canonical probe and a `GITHUB_PATH` entry for subsequent workflow steps.
 */
export function ffmpegPostInstallPathProjection(
  platform: NodeJS.Platform,
  currentPath: string | undefined,
  chocolateyInstall: string | undefined,
): FfmpegPostInstallPathProjection {
  const processPath = currentPath ?? '';
  if (platform !== 'win32') return Object.freeze({ processPath });
  const root = chocolateyInstall?.trim();
  if (root === undefined || root === '') {
    throw new Error('ChocolateyInstall is required to resolve the installed Windows ffmpeg binary');
  }
  const bin = win32.join(root, 'lib', 'ffmpeg', 'tools', 'ffmpeg', 'bin');
  const alreadyPresent = processPath
    .split(';')
    .some((entry) => entry.trim().replaceAll('/', '\\').toLowerCase() === bin.toLowerCase());
  return Object.freeze({
    processPath: alreadyPresent || processPath === '' ? processPath || bin : `${bin};${processPath}`,
    githubPathEntry: bin,
  });
}

/**
 * Hard per-child budgets for host preparation (scar for CI run 30382383876:
 * an unbounded preparation child consumed a full 30-minute shard budget).
 * Generous for slow mirrors, yet the complete worst-case preparation chain
 * stays an order of magnitude under the job ceiling.
 */
export interface HostPreparationBudgets {
  readonly installStepTimeoutMs: number;
  readonly fetchTimeoutMs: number;
}

function budgetFrom(env: Readonly<Record<string, string | undefined>>, name: string, defaultMs: number): number {
  const raw = env[name];
  if (raw === undefined || raw === '') return defaultMs;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer of milliseconds, got ${JSON.stringify(raw)}`);
  }
  return parsed;
}

/** Resolve preparation budgets, honoring explicit env overrides and refusing malformed ones. */
export function hostPreparationBudgets(env: Readonly<Record<string, string | undefined>>): HostPreparationBudgets {
  return Object.freeze({
    // 900s: run 30460154199 measured apt-get killed mid-install at 300s; run
    // 30471364736 measured it killed at 600s still actively downloading — twice-
    // measured valid work proving mirror-speed variance exceeds both prior budgets.
    // Paired with the recommends-trim + Acquire::Retries hardening in the install
    // plan below, so the budget absorbs variance rather than waste.
    installStepTimeoutMs: budgetFrom(env, 'LITESHIP_CI_HOST_INSTALL_STEP_TIMEOUT_MS', 900_000),
    fetchTimeoutMs: budgetFrom(env, 'LITESHIP_CI_HOST_FETCH_TIMEOUT_MS', 120_000),
  });
}

/** Package-manager commands used only when the canonical ffmpeg probe is red. */
export function ffmpegInstallPlan(platform: NodeJS.Platform): readonly HostCommand[] {
  switch (platform) {
    case 'linux':
      return Object.freeze([
        Object.freeze({ command: 'sudo', args: Object.freeze(['apt-get', 'update']) }),
        // --no-install-recommends: the render capability needs the ffmpeg binary, not
        // its recommends tail (the bulk of the slow-mirror download). Acquire::Retries:
        // a stalled fetch retries instead of consuming the whole install budget.
        Object.freeze({
          command: 'sudo',
          args: Object.freeze([
            'apt-get',
            'install',
            '-y',
            '--no-install-recommends',
            '-o',
            'Acquire::Retries=3',
            'ffmpeg',
          ]),
        }),
      ]);
    case 'darwin':
      return Object.freeze([Object.freeze({ command: 'brew', args: Object.freeze(['install', 'ffmpeg']) })]);
    case 'win32':
      return Object.freeze([
        Object.freeze({
          command: 'choco',
          args: Object.freeze([
            'install',
            'ffmpeg',
            '--version',
            WINDOWS_FFMPEG_CHOCOLATEY_VERSION,
            '--yes',
            '--no-progress',
          ]),
        }),
      ]);
    default:
      throw new Error(`no CI ffmpeg provisioning law for platform ${platform}`);
  }
}
