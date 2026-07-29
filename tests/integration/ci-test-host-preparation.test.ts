/**
 * Preparation-terminates law for `scripts/prepare-ci-test-host.ts` — the
 * executable scar for CI run 30382383876, where one shard's host preparation
 * hung for 29m51s and was killed only by the 30-minute job ceiling.
 *
 * Both cases plant deliberately misbehaving executables on PATH and prove the
 * script terminates in seconds with a classified, phase-attributed failure:
 *
 * 1. a probe that cannot finish inside its budget → the probe times out and
 *    preparation refuses WITHOUT attempting provisioning (a timeout is not
 *    evidence ffmpeg is missing);
 * 2. a fast-failing `ffmpeg` plus a hanging installer (`choco`/`brew`/`sudo`)
 *    → the install step is killed at its budget and named in the failure.
 *
 * Cross-platform by construction, no skips: the fake `ffmpeg` is a copy of the
 * running Node binary (spawnable everywhere; `-version` is not a Node flag so
 * the real probe fails fast with a nonzero status), the probe-hang case uses a
 * 1ms budget no real process spawn can beat, and the hanging installer is a
 * platform-native shim (`.cmd` via cross-spawn on Windows, `#!/bin/sh` else).
 *
 * @module
 */
import { afterEach, describe, expect, it } from 'vitest';
import { scaledTimeout } from '../../vitest.shared.js';
import { chmodSync, copyFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { spawnArgvCaptureWithEnv } from '../../packages/command/src/host/launcher.js';

const fixtureDirs: string[] = [];

function fixtureDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'liteship-ci-host-'));
  fixtureDirs.push(dir);
  return dir;
}

/**
 * A spawnable `ffmpeg` stand-in: the running Node binary copied under the
 * probed name. It launches everywhere the suite runs, and because `-version`
 * is not a Node flag the version probe exits nonzero in milliseconds — a
 * deterministic red probe that is NOT a timeout.
 */
function planFakeFfmpeg(dir: string): void {
  const target = join(dir, process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
  copyFileSync(process.execPath, target);
  if (process.platform !== 'win32') chmodSync(target, 0o755);
}

/** A hanging installer shim resolved by the launcher (cross-spawn): `.cmd` on Windows, `#!/bin/sh` elsewhere. */
function planHangingInstaller(dir: string): void {
  if (process.platform === 'win32') {
    writeFileSync(join(dir, 'choco.cmd'), '@echo off\r\nnode -e "setTimeout(() => {}, 20_000);"\r\n', 'utf8');
    return;
  }
  const name = process.platform === 'darwin' ? 'brew' : 'sudo';
  const path = join(dir, name);
  writeFileSync(path, '#!/bin/sh\nsleep 20\n', 'utf8');
  chmodSync(path, 0o755);
}

// Reuse the exact PATH key the parent environment carries (Windows spells it
// `Path`); introducing a second casing would hand the child two PATH entries.
const pathKey = Object.keys(process.env).find((key) => key.toUpperCase() === 'PATH') ?? 'PATH';

async function runPreparation(shimDir: string, env: Readonly<Record<string, string>>) {
  return spawnArgvCaptureWithEnv('pnpm', ['exec', 'tsx', 'scripts/prepare-ci-test-host.ts', '--ffmpeg'], {
    cwd: process.cwd(),
    envAdditions: { ...env, [pathKey]: `${shimDir}${delimiter}${process.env[pathKey] ?? ''}` },
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

describe('prepare-ci-test-host — bounded preparation', () => {
  it(
    'a probe that exhausts its budget refuses preparation without attempting provisioning',
    { timeout: scaledTimeout(120_000) },
    async () => {
      const dir = fixtureDir();
      planFakeFfmpeg(dir);

      // No real process spawn completes inside 1ms, so the probe child is
      // killed at its budget and classified as a timeout on every platform.
      const result = await runPreparation(dir, { LITESHIP_FFMPEG_PROBE_TIMEOUT_MS: '1' });

      expect(result.timedOut).toBe(false);
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('ffmpeg version probe timed out after 1ms');
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
      planFakeFfmpeg(dir);
      planHangingInstaller(dir);

      const result = await runPreparation(dir, { LITESHIP_CI_HOST_INSTALL_PHASE_TIMEOUT_MS: '800' });

      expect(result.timedOut).toBe(false);
      expect(result.exitCode).not.toBe(0);
      // The child spawns with the REMAINING phase budget (<=800ms), so the
      // classified message names whatever remained, not the raw configured value.
      expect(result.stderr).toMatch(/timed out after \d+ms/u);
      expect(result.stderr).toContain('"ciTestHostPhase":"ffmpeg-install","event":"start"');
      expect(phaseDurationMs(result.stderr, 'ffmpeg-install', 'failed')).toBeLessThan(15_000);
    },
  );
});
