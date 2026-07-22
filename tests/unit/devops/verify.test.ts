/** Workspace verification must end in the registry-backed quick claim. */
import { describe, expect, it, vi } from 'vitest';
import { runVerify, VERIFY_PHASES, type VerifySpawn } from '../../../scripts/verify.js';

describe('workspace verify phase contract', () => {
  it('runs environment, build, tests, then the exact quick-profile command', async () => {
    const calls: Array<readonly [string, readonly string[]]> = [];
    const spawn: VerifySpawn = async (command, args) => {
      calls.push([command, args]);
      return { exitCode: 0 };
    };

    expect(VERIFY_PHASES.map((phase) => phase.name)).toEqual(['environment', 'build', 'test', 'quick checks']);
    expect(VERIFY_PHASES.at(-1)?.cmd).toEqual(['node', 'packages/cli/bin/liteship.mjs', 'check', '--profile', 'quick']);
    await expect(runVerify(spawn, vi.fn())).resolves.toBe(0);
    expect(calls).toEqual(VERIFY_PHASES.map((phase) => [phase.cmd[0], phase.cmd.slice(1)]));
  });

  it('fails fast and never reaches quick after an earlier failure', async () => {
    const calls: string[] = [];
    const spawn: VerifySpawn = async (command, args) => {
      calls.push([command, ...args].join(' '));
      return { exitCode: calls.length === 2 ? 17 : 0 };
    };

    await expect(runVerify(spawn, vi.fn())).resolves.toBe(17);
    expect(calls).toEqual(['pnpm run doctor', 'pnpm run build']);
  });

  it('propagates a failed quick phase', async () => {
    const spawn: VerifySpawn = async (_command, args) => ({
      exitCode: args.includes('quick') ? 23 : 0,
    });
    await expect(runVerify(spawn, vi.fn())).resolves.toBe(23);
  });
});
