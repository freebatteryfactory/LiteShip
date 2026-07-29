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
import { chmodSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

  it(
    'fells the process tree of a timed-out shim child so descendants stop mutating the host',
    { timeout: scaledTimeout(15_000) },
    async () => {
      // The installer shape: a .cmd/sh shim (choco, apt wrappers) whose
      // descendants are NOT reached by killing the shim itself. libuv's
      // kill-on-close Job Object covers direct node children on Windows, but a
      // cmd.exe shim's children escape it — the exact survivor my manual choco
      // repro produced. The descendant writes a marker file if it is still
      // alive 2s in; after a budget kill the marker must never appear on
      // Windows (taskkill /T fells the tree). On POSIX the direct kill reaches
      // signal-relaying parents (sudo relays SIGTERM) and the settle bound is
      // the backstop, so only settlement is asserted there.
      const dir = mkdtempSync(join(tmpdir(), 'liteship-treekill-'));
      const markerPath = join(dir, 'descendant-alive');
      try {
        writeFileSync(
          join(dir, 'survive.cjs'),
          "setTimeout(() => { require('node:fs').writeFileSync(process.env.LITESHIP_TEST_TREEKILL_MARKER, 'alive'); }, 2_000);\n" +
            'setTimeout(() => {}, 20_000);\n',
        );
        const isWindows = process.platform === 'win32';
        const runner = join(dir, isWindows ? 'runner.cmd' : 'runner');
        if (isWindows) {
          writeFileSync(runner, '@echo off\r\nnode "%~dp0survive.cjs"\r\n');
        } else {
          writeFileSync(runner, '#!/bin/sh\nnode "$(dirname "$0")/survive.cjs"\n');
          chmodSync(runner, 0o755);
        }
        const result = await spawnArgvCaptureWithEnv(runner, [], {
          timeoutMs: 400,
          envAdditions: { LITESHIP_TEST_TREEKILL_MARKER: markerPath },
        });
        expect(result.timedOut).toBe(true);
        if (isWindows) {
          expect(existsSync(markerPath)).toBe(false);
        }
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
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
