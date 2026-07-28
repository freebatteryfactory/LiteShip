/** Cross-platform CI test-host preparation policy. @module */

import { describe, expect, it } from 'vitest';
import { ZERO_SHA, ffmpegInstallPlan, standardsBaseTarget } from '../../../scripts/lib/ci-test-host-contract.js';

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
      { command: 'sudo', args: ['apt-get', 'install', '-y', 'ffmpeg'] },
    ]);
    expect(ffmpegInstallPlan('darwin')).toEqual([{ command: 'brew', args: ['install', 'ffmpeg'] }]);
    expect(ffmpegInstallPlan('win32')).toEqual([
      { command: 'choco', args: ['install', 'ffmpeg', '--yes', '--no-progress'] },
    ]);
  });

  it('fails closed on an unsupported platform instead of pretending capability', () => {
    expect(() => ffmpegInstallPlan('aix')).toThrow(/no CI ffmpeg provisioning law/u);
  });
});
