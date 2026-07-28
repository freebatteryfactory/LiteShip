/**
 * Preparation-terminates law for `scripts/prepare-ci-test-host.ts` — the
 * executable scar for CI run 30382383876, where one shard's host preparation
 * hung for 29m51s and was killed only by the 30-minute job ceiling.
 *
 * Both cases plant deliberately misbehaving executables on PATH and prove the
 * script terminates in seconds with a classified, phase-attributed failure:
 *
 * 1. a hanging `ffmpeg` → the probe times out, preparation refuses WITHOUT
 *    attempting provisioning (a timeout is not evidence ffmpeg is missing);
 * 2. a fast-failing `ffmpeg` plus a hanging installer (`sudo`/`brew`) → the
 *    install step is killed at its budget and named in the failure.
 *
 * POSIX-only: the shims are `#!/bin/sh` scripts, which Windows `spawnSync`
 * cannot execute without a shell. Windows keeps the same laws through the
 * mocked probe suite (ffmpeg-probe-branches) and the real-process launcher
 * suite (launcher-timeout), which both run everywhere.
 *
 * @module
 */
import { afterEach, describe, expect, it } from 'vitest';
import { scaledTimeout } from '../../vitest.shared.js';
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { spawnArgvCaptureWithEnv } from '../../packages/command/src/host/launcher.js';

const fixtureDirs: string[] = [];

function fixtureDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'liteship-ci-host-'));
  fixtureDirs.push(dir);
  return dir;
}

function writeShim(dir: string, name: string, body: string): void {
  const path = join(dir, name);
  writeFileSync(path, `#!/bin/sh\n${body}\n`, 'utf8');
  chmodSync(path, 0o755);
}

async function runPreparation(shimDir: string, env: Readonly<Record<string, string>>) {
  return spawnArgvCaptureWithEnv('pnpm', ['exec', 'tsx', 'scripts/prepare-ci-test-host.ts', '--ffmpeg'], {
    cwd: process.cwd(),
    envAdditions: { ...env, PATH: `${shimDir}${delimiter}${process.env.PATH ?? ''}` },
    timeoutMs: 90_000,
  });
}

afterEach(() => {
  for (const dir of fixtureDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * Boundedness is proved from the script's own phase telemetry rather than an
 * ambient clock: each record carries the measured child duration, so a phase
 * that ran anywhere near the 20s shim hang means the budget kill regressed.
 */
function phaseDurationMs(stderr: string, phase: string, event: 'end' | 'failed'): number {
  const match = new RegExp(`\\{"ciTestHostPhase":"${phase}","event":"${event}","durationMs":(\\d+)\\}`, 'u').exec(
    stderr,
  );
  expect(match, `expected a ${phase} ${event} phase record in:\n${stderr}`).not.toBeNull();
  return Number(match?.[1]);
}

describe.runIf(process.platform !== 'win32')('prepare-ci-test-host — bounded preparation', () => {
  it(
    'a hung ffmpeg probe refuses preparation in seconds without attempting provisioning',
    { timeout: scaledTimeout(120_000) },
    async () => {
      const dir = fixtureDir();
      // Bounded stand-in for a wedged ffmpeg: long enough to dwarf the probe
      // budget, short enough to self-clean if the kill path regresses.
      writeShim(dir, 'ffmpeg', 'sleep 20');

      const result = await runPreparation(dir, { LITESHIP_FFMPEG_PROBE_TIMEOUT_MS: '500' });

      expect(result.timedOut).toBe(false);
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('ffmpeg version probe timed out after 500ms');
      expect(result.stderr).toContain('"ciTestHostPhase":"ffmpeg-probe","event":"start"');
      expect(phaseDurationMs(result.stderr, 'ffmpeg-probe', 'end')).toBeLessThan(15_000);
      expect(result.stderr).not.toContain('"ciTestHostPhase":"ffmpeg-install"');
    },
  );

  it(
    'a hung installer child is killed at its budget and named in the classified failure',
    { timeout: scaledTimeout(120_000) },
    async () => {
      const dir = fixtureDir();
      writeShim(dir, 'ffmpeg', 'exit 1');
      const installer = process.platform === 'darwin' ? 'brew' : 'sudo';
      writeShim(dir, installer, 'sleep 20');

      const result = await runPreparation(dir, { LITESHIP_CI_HOST_INSTALL_STEP_TIMEOUT_MS: '800' });

      expect(result.timedOut).toBe(false);
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('timed out after 800ms');
      expect(result.stderr).toContain('"ciTestHostPhase":"ffmpeg-install","event":"start"');
      expect(phaseDurationMs(result.stderr, 'ffmpeg-install', 'failed')).toBeLessThan(15_000);
    },
  );
});
