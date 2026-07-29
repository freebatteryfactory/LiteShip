/** Cross-platform CI test-host preparation policy. @module */

import { describe, expect, it } from 'vitest';
import {
  ZERO_SHA,
  WINDOWS_FFMPEG_CHOCOLATEY_VERSION,
  ffmpegInstallPlan,
  ffmpegPostInstallPathProjection,
  hostPreparationBudgets,
  standardsBaseTarget,
} from '../../../scripts/lib/ci-test-host-contract.js';

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
  it('defaults every provisioning child to a finite budget far under the 30-minute job ceiling', () => {
    // 900s install: run 30460154199 measured apt-get killed mid-install at 300s;
    // run 30471364736 measured it killed at 600s STILL actively downloading
    // ("...[604 kB]" at the kill) — twice-measured valid work proving mirror-speed
    // variance exceeds both prior budgets (the only sanctioned reason to raise
    // one). Paired with the recommends-trim + Acquire::Retries hardening above so
    // the budget covers variance, not waste. Still 2x under the job ceiling.
    expect(hostPreparationBudgets({})).toEqual({
      installStepTimeoutMs: 900_000,
      fetchTimeoutMs: 120_000,
    });
  });

  it('honors explicit environment overrides', () => {
    expect(
      hostPreparationBudgets({
        LITESHIP_CI_HOST_INSTALL_STEP_TIMEOUT_MS: '5000',
        LITESHIP_CI_HOST_FETCH_TIMEOUT_MS: '700',
      }),
    ).toEqual({ installStepTimeoutMs: 5000, fetchTimeoutMs: 700 });
  });

  it('refuses malformed or non-positive overrides instead of running unbounded', () => {
    expect(() => hostPreparationBudgets({ LITESHIP_CI_HOST_FETCH_TIMEOUT_MS: 'soon' })).toThrow(/positive integer/u);
    expect(() => hostPreparationBudgets({ LITESHIP_CI_HOST_INSTALL_STEP_TIMEOUT_MS: '0' })).toThrow(
      /positive integer/u,
    );
    expect(() => hostPreparationBudgets({ LITESHIP_CI_HOST_FETCH_TIMEOUT_MS: '1.5' })).toThrow(/positive integer/u);
  });
});
