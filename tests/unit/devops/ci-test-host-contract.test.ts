/** Cross-platform CI test-host preparation policy. @module */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  ZERO_SHA,
  WINDOWS_FFMPEG_CHOCOLATEY_VERSION,
  ffmpegInstallPlan,
  ffmpegPostInstallPathProjection,
  hostPreparationBudgets,
  hostPreparationConsumers,
  remainingPhaseBudgetMs,
  standardsBaseTarget,
} from '../../../scripts/lib/ci-test-host-contract.js';

const ROOT = resolve(import.meta.dirname, '../../..');

describe('standards base selection', () => {
  it('uses the exact PR/push base SHA and a one-object bounded fetch', () => {
    const sha = 'a'.repeat(40);
    expect(standardsBaseTarget({ baseSha: sha, baseRef: 'main' })).toEqual({
      ref: sha,
      fetchArgs: ['fetch', '--no-tags', '--depth=1', 'origin', sha],
    });
  });

  it('uses the named integration branch for a first push or manual run', () => {
    expect(standardsBaseTarget({ baseSha: ZERO_SHA, baseRef: 'release' })).toEqual({
      ref: 'origin/release',
      fetchArgs: ['fetch', '--no-tags', '--depth=1', 'origin', 'release'],
    });
    expect(standardsBaseTarget({})).toEqual({
      ref: 'origin/main',
      fetchArgs: ['fetch', '--no-tags', '--depth=1', 'origin', 'main'],
    });
  });
});

describe('ffmpeg provisioning', () => {
  it('has one explicit non-shell install plan for every supported CI platform', () => {
    expect(ffmpegInstallPlan('linux')).toEqual([
      { command: 'sudo', args: ['apt-get', 'update'] },
      // --no-install-recommends: ffmpeg's recommends drag a long package tail that
      // dominated the slow-mirror timeouts; the render capability needs the binary,
      // not the docs/extras. Acquire::Retries: a stalled mirror fetch retries
      // instead of eating the whole budget (runs 30460154199 + 30471364736 both
      // died mid-download on transient mirror slowness).
      {
        command: 'sudo',
        args: ['apt-get', 'install', '-y', '--no-install-recommends', '-o', 'Acquire::Retries=3', 'ffmpeg'],
      },
    ]);
    expect(ffmpegInstallPlan('darwin')).toEqual([{ command: 'brew', args: ['install', 'ffmpeg'] }]);
    expect(ffmpegInstallPlan('win32')).toEqual([
      {
        command: 'choco',
        args: ['install', 'ffmpeg', '--version', WINDOWS_FFMPEG_CHOCOLATEY_VERSION, '--yes', '--no-progress'],
      },
    ]);
  });

  it('projects Chocolatey ffmpeg into the current process and subsequent GitHub Actions steps', () => {
    expect(ffmpegPostInstallPathProjection('win32', 'C:\\Windows\\System32', 'C:\\ProgramData\\chocolatey')).toEqual({
      processPath: 'C:\\ProgramData\\chocolatey\\lib\\ffmpeg\\tools\\ffmpeg\\bin;C:\\Windows\\System32',
      githubPathEntry: 'C:\\ProgramData\\chocolatey\\lib\\ffmpeg\\tools\\ffmpeg\\bin',
    });
  });

  it('does not duplicate an already-projected Windows ffmpeg path', () => {
    const bin = 'C:\\ProgramData\\chocolatey\\lib\\ffmpeg\\tools\\ffmpeg\\bin';
    expect(ffmpegPostInstallPathProjection('win32', `${bin};C:\\Windows`, 'C:\\ProgramData\\chocolatey')).toEqual({
      processPath: `${bin};C:\\Windows`,
      githubPathEntry: bin,
    });
  });

  it('fails closed without the Chocolatey root and leaves non-Windows PATH values unchanged', () => {
    expect(() => ffmpegPostInstallPathProjection('win32', 'C:\\Windows', undefined)).toThrow(
      /ChocolateyInstall is required/u,
    );
    expect(ffmpegPostInstallPathProjection('linux', '/usr/bin', undefined)).toEqual({ processPath: '/usr/bin' });
  });

  it('fails closed on an unsupported platform instead of pretending capability', () => {
    expect(() => ffmpegInstallPlan('aix')).toThrow(/no CI ffmpeg provisioning law/u);
  });
});

describe('host preparation budgets (scar for CI run 30382383876)', () => {
  it('defaults the whole install phase to one finite budget far under the 30-minute job ceiling', () => {
    // 900s install PHASE: run 30460154199 measured apt-get killed mid-install at
    // 300s; run 30471364736 measured it killed at 600s STILL actively downloading
    // ("...[604 kB]" at the kill) — twice-measured valid work proving mirror-speed
    // variance exceeds both prior budgets (the only sanctioned reason to raise
    // one). The budget is PHASE-wide, not per-step: the linux plan has two apt
    // children, and a per-step 900s would admit a 30-minute worst case — exactly
    // the shortest consuming job's ceiling, so GitHub could kill the job before
    // the bounded child emits its own failure.
    expect(hostPreparationBudgets({})).toEqual({
      installPhaseTimeoutMs: 900_000,
      fetchTimeoutMs: 120_000,
    });
  });

  it('honors explicit environment overrides', () => {
    expect(
      hostPreparationBudgets({
        LITESHIP_CI_HOST_INSTALL_PHASE_TIMEOUT_MS: '5000',
        LITESHIP_CI_HOST_FETCH_TIMEOUT_MS: '700',
      }),
    ).toEqual({ installPhaseTimeoutMs: 5000, fetchTimeoutMs: 700 });
  });

  it('refuses malformed or non-positive overrides instead of running unbounded', () => {
    expect(() => hostPreparationBudgets({ LITESHIP_CI_HOST_FETCH_TIMEOUT_MS: 'soon' })).toThrow(/positive integer/u);
    expect(() => hostPreparationBudgets({ LITESHIP_CI_HOST_INSTALL_PHASE_TIMEOUT_MS: '0' })).toThrow(
      /positive integer/u,
    );
    expect(() => hostPreparationBudgets({ LITESHIP_CI_HOST_FETCH_TIMEOUT_MS: '1.5' })).toThrow(/positive integer/u);
  });

  it('shares the phase budget across steps and fails closed once it is exhausted', () => {
    // The deadline is fixed when the phase starts; each step receives only what
    // remains. A second step cannot re-arm the full budget (the defect class the
    // per-step timeout admitted), and an exhausted phase refuses further children
    // instead of spawning one with a zero or negative timeout.
    expect(remainingPhaseBudgetMs(10_000, 1_000)).toBe(9_000);
    expect(remainingPhaseBudgetMs(10_000, 9_999)).toBe(1);
    expect(() => remainingPhaseBudgetMs(10_000, 10_000)).toThrow(/install phase budget exhausted/u);
    expect(() => remainingPhaseBudgetMs(10_000, 11_000)).toThrow(/install phase budget exhausted/u);
  });

  it('every CI job that runs host preparation has a ceiling with room above worst-case preparation', () => {
    // The P1 class (PR #185 review): preparation budgets that sum past a
    // consuming job's timeout-minutes mean GitHub kills the job mid-preparation
    // and the bounded-child failure never reports. Law: for EVERY workflow job
    // that invokes prepare-ci-test-host, worst-case preparation (whole install
    // phase + the three bounded git children of the standards phase) must leave
    // at least five minutes of ceiling, so the child's own timeout always fires
    // first and the job still has room to report.
    const budgets = hostPreparationBudgets({});
    const consumers = hostPreparationConsumers(readFileSync(join(ROOT, '.github/workflows/ci.yml'), 'utf8'));
    expect(consumers.length).toBeGreaterThanOrEqual(5); // anti-vacuity: the parser found the real jobs
    const worstCaseMs = budgets.installPhaseTimeoutMs + 3 * budgets.fetchTimeoutMs;
    for (const consumer of consumers) {
      expect(
        consumer.timeoutMinutes * 60_000 - worstCaseMs,
        `${consumer.job} (${consumer.timeoutMinutes}m ceiling) must leave >=5m above worst-case preparation`,
      ).toBeGreaterThanOrEqual(300_000);
    }
  });

  it('the consumer parser reds a job that loses its ceiling or gains an unbounded shape (negative controls)', () => {
    const workflow = [
      'jobs:',
      '  prep-user:',
      '    timeout-minutes: 30',
      '    steps:',
      '      - run: pnpm exec tsx scripts/prepare-ci-test-host.ts --ffmpeg',
      '  bystander:',
      '    timeout-minutes: 10',
      '    steps:',
      '      - run: echo hi',
    ].join('\n');
    expect(hostPreparationConsumers(workflow)).toEqual([{ job: 'prep-user', timeoutMinutes: 30 }]);
    const unbounded = workflow.replace('    timeout-minutes: 30\n', '');
    expect(() => hostPreparationConsumers(unbounded)).toThrow(/prep-user.*timeout-minutes/u);
  });

  describe('the host-preparation ceiling is read at the job level', () => {
    it('a step-level timeout-minutes does not satisfy the job-level ceiling', () => {
      const workflow = [
        'jobs:',
        '  prep-user:',
        '    steps:',
        '      - run: pnpm exec tsx scripts/prepare-ci-test-host.ts --ffmpeg',
        '        timeout-minutes: 30',
      ].join('\n');

      expect(() => hostPreparationConsumers(workflow)).toThrow(/prep-user.*timeout-minutes/u);
    });

    it('comments and echo commands do not enroll a job', () => {
      const workflow = [
        'jobs:',
        '  real-user:',
        '    timeout-minutes: 30',
        '    steps:',
        '      - run: pnpm exec tsx scripts/prepare-ci-test-host.ts --ffmpeg',
        '  decoy:',
        '    timeout-minutes: 10',
        '    steps:',
        '      # prepare-ci-test-host is documented here',
        '      - run: echo prepare-ci-test-host',
      ].join('\n');

      expect(hostPreparationConsumers(workflow)).toEqual([{ job: 'real-user', timeoutMinutes: 30 }]);
    });

    it('zero consumers is a refusal, not an empty authority', () => {
      const workflow = ['jobs:', '  bystander:', '    timeout-minutes: 10', '    steps:', '      - run: echo hi'].join(
        '\n',
      );

      expect(() => hostPreparationConsumers(workflow)).toThrow(/no workflow job invokes.*prepare-ci-test-host/u);
    });

    it('unreadable or duplicate workflow YAML is refused before it can classify consumers', () => {
      const flow = ['jobs:', '  prep-user:', '    steps: [{ run: prepare-ci-test-host }]'].join('\n');
      const duplicate = [
        'jobs:',
        '  prep-user:',
        '    timeout-minutes: 30',
        '    timeout-minutes: 40',
        '    steps:',
        '      - run: pnpm exec tsx scripts/prepare-ci-test-host.ts',
      ].join('\n');

      expect(() => hostPreparationConsumers(flow)).toThrow(/unreadable workflow YAML/u);
      expect(() => hostPreparationConsumers(duplicate)).toThrow(/duplicate key timeout-minutes/u);
    });
  });
});
