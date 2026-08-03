/** Pure policy for preparing cross-platform CI hosts that execute Node tests. @module */

import { win32 } from 'node:path';
import { ValidationError } from '../../packages/error/src/index.js';
import {
  activeLinesOf,
  childIndicesOf,
  stepIndicesOf,
  stepRunCommandOf,
  unreadableYamlViolations,
  workflowJobSections,
} from '../../packages/cli/src/internal/workflow-action-pins.js';

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
 * Hard budgets for host preparation (scar for CI run 30382383876: an unbounded
 * preparation child consumed a full 30-minute shard budget). The install budget
 * is PHASE-wide — shared by every step of the install plan — so the worst-case
 * preparation chain is bounded by ONE number that stays well under every
 * consuming job's ceiling, and a multi-step plan cannot multiply it.
 */
export interface HostPreparationBudgets {
  readonly installPhaseTimeoutMs: number;
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
    // plan below, so the budget absorbs variance rather than waste. Phase-wide:
    // apt-get update draws from the same 900s as the install itself.
    installPhaseTimeoutMs: budgetFrom(env, 'LITESHIP_CI_HOST_INSTALL_PHASE_TIMEOUT_MS', 900_000),
    fetchTimeoutMs: budgetFrom(env, 'LITESHIP_CI_HOST_FETCH_TIMEOUT_MS', 120_000),
  });
}

/**
 * Milliseconds left before a fixed phase deadline. Each install step spawns
 * with only what remains, so the plan as a whole can never exceed the phase
 * budget; an exhausted phase refuses further children instead of spawning one
 * with a zero or negative timeout.
 */
export function remainingPhaseBudgetMs(phaseDeadlineMs: number, nowMs: number): number {
  const remaining = phaseDeadlineMs - nowMs;
  if (remaining <= 0) {
    throw new Error('host preparation install phase budget exhausted before all plan steps completed');
  }
  return remaining;
}

export interface HostPreparationConsumer {
  readonly job: string;
  readonly timeoutMinutes: number;
}

/**
 * Every workflow job that invokes prepare-ci-test-host, with its declared
 * ceiling. A consuming job WITHOUT `timeout-minutes` is refused outright: the
 * whole point of bounded preparation is that the child's timeout fires before
 * the host's, which is unprovable against an undeclared ceiling.
 */
export function hostPreparationConsumers(workflowSource: string): readonly HostPreparationConsumer[] {
  const unreadable = unreadableYamlViolations(workflowSource);
  if (unreadable.length > 0) {
    throw ValidationError('ci.host-preparation.workflow', `unreadable workflow YAML: ${unreadable.join('; ')}`);
  }

  const consumers: HostPreparationConsumer[] = [];
  for (const [job, section] of workflowJobSections(workflowSource)) {
    const lines = activeLinesOf(section);
    const invokesPreparation = stepIndicesOf(lines).some((stepIndex) =>
      stepRunCommandOf(lines, stepIndex)
        .split('\n')
        .some((line) => /^\s*pnpm exec tsx scripts\/prepare-ci-test-host\.ts(?:\s|$)/u.test(line)),
    );
    if (!invokesPreparation) continue;

    const timeoutLine = childIndicesOf(lines, 0)
      .map((index) => lines[index]!.body)
      .find((body) => body.startsWith('timeout-minutes:'));
    const timeout = /^timeout-minutes:\s*([0-9]+)(?:\s+#.*)?$/u.exec(timeoutLine ?? '');
    if (timeout === null) {
      throw ValidationError(
        'ci.host-preparation.timeout-minutes',
        `job ${job} runs host preparation but declares no valid job-level timeout-minutes ceiling`,
      );
    }
    consumers.push(Object.freeze({ job, timeoutMinutes: Number(timeout[1]) }));
  }
  if (consumers.length === 0) {
    throw ValidationError(
      'ci.host-preparation.consumers',
      'no workflow job invokes pnpm exec tsx scripts/prepare-ci-test-host.ts',
    );
  }
  return Object.freeze(consumers);
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
