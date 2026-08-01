/**
 * Drift guard — asserts scripts/lib/spawn.ts preserves NODE_V8_COVERAGE
 * (and process.env in general) when spawning children.
 *
 * Subprocess coverage capture depends on uninterrupted env inheritance. The
 * cold-build launcher separately proves bounded additions merge over the parent.
 *
 * @module
 */

import { describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnArgv } from '../../../scripts/lib/spawn.js';
import { spawnArgvCaptureWithEnv, spawnArgvVisible } from '../../../packages/command/src/host/launcher.js';

describe('spawn coverage inheritance', () => {
  it('children inherit NODE_V8_COVERAGE from parent', async () => {
    process.env.LITESHIP_TEST_SENTINEL = 'inheritance-marker-7331';
    try {
      const result = await spawnArgv(
        'node',
        ['-e', 'process.stderr.write(process.env.LITESHIP_TEST_SENTINEL ?? "MISSING")'],
        { stdio: ['ignore', 'ignore', 'pipe'] },
      );
      expect(result.exitCode).toBe(0);
      expect(result.stderrTail).toContain('inheritance-marker-7331');
    } finally {
      delete process.env.LITESHIP_TEST_SENTINEL;
    }
  });

  it('children inherit NODE_V8_COVERAGE specifically when set', async () => {
    // Node resolves NODE_V8_COVERAGE to an absolute path on startup (and on
    // Windows rewrites forward slashes to backslashes), so we can't byte-match
    // the original value. Use a tmpdir-rooted path with a unique suffix and
    // assert the suffix survives — that proves the env var was inherited.
    // Tmpdir keeps stray coverage files outside the repo working tree.
    const covDir = mkdtempSync(join(tmpdir(), 'liteship-cov-marker-'));
    process.env.NODE_V8_COVERAGE = covDir;
    try {
      const result = await spawnArgv(
        'node',
        ['-e', 'process.stderr.write(process.env.NODE_V8_COVERAGE ?? "MISSING")'],
        { stdio: ['ignore', 'ignore', 'pipe'] },
      );
      expect(result.exitCode).toBe(0);
      expect(result.stderrTail).not.toContain('MISSING');
      // Match the unique tmpdir suffix — survives even after Node's path
      // resolution and Windows separator rewriting.
      expect(result.stderrTail).toContain('liteship-cov-marker-');
    } finally {
      delete process.env.NODE_V8_COVERAGE;
      rmSync(covDir, { recursive: true, force: true });
    }
  });

  it('env additions preserve inherited coverage while supplying the bounded child setting', async () => {
    const covDir = mkdtempSync(join(tmpdir(), 'liteship-parent-coverage-'));
    process.env.NODE_V8_COVERAGE = covDir;
    try {
      const result = await spawnArgvCaptureWithEnv(
        'node',
        [
          '-e',
          'process.stdout.write(`${process.env.NODE_V8_COVERAGE ?? "MISSING"}|${process.env.GOMAXPROCS ?? "MISSING"}`)',
        ],
        {
          envAdditions: { GOMAXPROCS: '2' },
        },
      );
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('liteship-parent-coverage');
      expect(result.stdout).toContain('|2');
    } finally {
      delete process.env.NODE_V8_COVERAGE;
      rmSync(covDir, { recursive: true, force: true });
    }
  });
});

describe('shard spawn env reaches the child', () => {
  it('an envAdditions entry round-trips into the child process environment', async () => {
    const result = await spawnArgvVisible(
      'node',
      ['-e', 'process.exit(process.env.LITESHIP_SPAWN_PROBE === "shard-env-7331" ? 0 : 1)'],
      {
        envAdditions: { LITESHIP_SPAWN_PROBE: 'shard-env-7331' },
      },
    );
    expect(result.exitCode).toBe(0);
  });

  it('additions are the sole channel beyond the ordinarily inherited environment', async () => {
    delete process.env.LITESHIP_SPAWN_PROBE;
    const result = await spawnArgvVisible(
      'node',
      ['-e', 'process.exit(process.env.LITESHIP_SPAWN_PROBE === undefined ? 0 : 1)'],
      // Commit 0.3 makes scripts part of typecheck:scripts, after which an
      // `env:` spelling at the shard caller is also a compile-time error.
      { cwd: process.cwd() },
    );
    expect(result.exitCode).toBe(0);
  });
});
