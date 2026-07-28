/**
 * Bounded-execution law for the cold-build capture launcher.
 *
 * Scar for CI run 30382383876: a host-preparation child hung for the entire
 * 30-minute job budget because no subprocess in the preparation chain carried
 * an enforceable timeout. The launcher is the owning seam: every caller that
 * declares a budget must get its child killed at that budget and receive a
 * classified timed-out result instead of waiting on the job ceiling.
 *
 * @module
 */
import { describe, expect, it } from 'vitest';
import { scaledTimeout } from '../../../vitest.shared.js';
import { spawnArgvCaptureWithEnv } from '../../../packages/command/src/host/launcher.js';

describe('spawnArgvCaptureWithEnv — bounded execution', () => {
  // Boundedness is asserted from public behavior, not wall clocks: a child that
  // survives its budget writes LATE to stdout at 8s (far above the ~3s settle
  // ceiling), so captured LATE means the kill/settle path regressed. The scaled
  // vitest timeout is the coarse backstop.
  const lateAfterHang = "setTimeout(() => { process.stdout.write('LATE'); }, 8_000); setTimeout(() => {}, 20_000);";

  it(
    'kills a hung child at the declared budget and marks the result timed out',
    { timeout: scaledTimeout(15_000) },
    async () => {
      const result = await spawnArgvCaptureWithEnv(process.execPath, ['-e', lateAfterHang], { timeoutMs: 400 });
      expect(result.timedOut).toBe(true);
      expect(result.exitCode).not.toBe(0);
      expect(result.stdout).not.toContain('LATE');
    },
  );

  it(
    'settles at the budget even when a grandchild holds the stdio pipes open',
    { timeout: scaledTimeout(15_000) },
    async () => {
      // The real incident shape: the direct child dies (or is killed) but a
      // spawned grandchild inherits stdout/stderr and never exits, so waiting
      // for stream close waits on the grandchild — unbounded. The budget must
      // bound settlement, not just signal delivery.
      const grandchildHolder =
        "const{spawn}=require('node:child_process');" +
        `spawn(process.execPath,['-e',${JSON.stringify(lateAfterHang)}],{stdio:['ignore','inherit','inherit']});`;
      const result = await spawnArgvCaptureWithEnv(process.execPath, ['-e', grandchildHolder], { timeoutMs: 400 });
      expect(result.timedOut).toBe(true);
      expect(result.stdout).not.toContain('LATE');
    },
  );

  it('reports timedOut false for a child that completes inside its budget', async () => {
    const result = await spawnArgvCaptureWithEnv(process.execPath, ['-e', 'process.stdout.write("done")'], {
      timeoutMs: 30_000,
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('done');
    expect(result.timedOut).toBe(false);
  });

  it('reports timedOut false when no budget is declared (legacy callers unchanged)', async () => {
    const result = await spawnArgvCaptureWithEnv(process.execPath, ['-e', 'process.stdout.write("ok")']);
    expect(result.exitCode).toBe(0);
    expect(result.timedOut).toBe(false);
  });

  it('refuses a non-positive or non-integer budget instead of running unbounded', async () => {
    await expect(spawnArgvCaptureWithEnv(process.execPath, ['-e', ''], { timeoutMs: 0 })).rejects.toThrow(
      /positive integer/u,
    );
    await expect(spawnArgvCaptureWithEnv(process.execPath, ['-e', ''], { timeoutMs: 1.5 })).rejects.toThrow(
      /positive integer/u,
    );
  });
});
