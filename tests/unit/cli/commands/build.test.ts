/**
 * `liteship build` command proof.
 *
 * The command's only outbound capability is bound through
 * `createBuildCommand`; these tests execute the real decision/receipt logic
 * with a scripted spawn boundary. The production `build(opts)` wrapper is
 * exercised separately through its missing-app guard, preserving its exact
 * public contract without launching a host build.
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { build, createBuildCommand, type BuildReceipt } from '../../../../packages/cli/src/commands/build.js';
import { captureCli } from '../../../integration/cli/capture.js';

const roots: string[] = [];

function fixture(...files: readonly string[]): string {
  const root = mkdtempSync(join(tmpdir(), 'liteship-build-'));
  roots.push(root);
  for (const file of files) writeFileSync(join(root, file), '');
  return root;
}

function lastReceipt(stdout: string): BuildReceipt {
  return JSON.parse(stdout.trim().split('\n').pop()!) as BuildReceipt;
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('liteship build', () => {
  it('the public build(opts) rejects the current directory without liteship.config.ts', async () => {
    const root = fixture();
    const previousCwd = process.cwd();
    process.chdir(root);
    let result: { exit: number; stdout: string; stderr: string };
    try {
      result = await captureCli(() => build());
    } finally {
      process.chdir(previousCwd);
    }

    expect(result.exit).toBe(1);
    expect(result.stdout).toBe('');
    expect(JSON.parse(result.stderr.trim())).toMatchObject({
      status: 'failed',
      command: 'build',
      code: 'cli/config-invalid',
      error: expect.stringContaining('no liteship.config.ts'),
      hint: expect.stringContaining('npm create liteship'),
    });
  });

  it('rejects a LiteShip config without an Astro or Vite host before spawning', async () => {
    const root = fixture('liteship.config.ts');
    const spawn = vi.fn(async () => ({ exitCode: 0, stderrTail: '' }));
    const run = createBuildCommand(spawn);
    const result = await captureCli(() => run({ cwd: root }));

    expect(result.exit).toBe(1);
    expect(spawn).not.toHaveBeenCalled();
    expect(result.stdout).toBe('');
    expect(JSON.parse(result.stderr.trim())).toMatchObject({
      status: 'failed',
      command: 'build',
      code: 'cli/config-invalid',
      error: expect.stringContaining('no host build config'),
      hint: expect.stringContaining('re-run `liteship build`'),
    });
  });

  it('runs the Astro build with exact argv/cwd and emits an ok BuildReceipt', async () => {
    const root = fixture('liteship.config.ts', 'astro.config.ts');
    const spawn = vi.fn(async () => ({ exitCode: 0, stderrTail: '' }));
    const run = createBuildCommand(spawn);
    const result = await captureCli(() => run({ cwd: root }));

    expect(result.exit).toBe(0);
    expect(spawn).toHaveBeenCalledOnce();
    expect(spawn).toHaveBeenCalledWith('pnpm', ['exec', 'astro', 'build'], { cwd: root });
    expect(result.stderr).toBe('');
    expect(lastReceipt(result.stdout)).toMatchObject({
      status: 'ok',
      command: 'build',
      host: 'astro',
      exitCode: 0,
    });
    expect(Number.isNaN(Date.parse(lastReceipt(result.stdout).timestamp))).toBe(false);
  });

  it('runs the Vite build with exact argv/cwd and emits an ok BuildReceipt', async () => {
    const root = fixture('liteship.config.ts', 'vite.config.mts');
    const spawn = vi.fn(async () => ({ exitCode: 0, stderrTail: '' }));
    const run = createBuildCommand(spawn);
    const result = await captureCli(() => run({ cwd: root }));

    expect(result.exit).toBe(0);
    expect(spawn).toHaveBeenCalledOnce();
    expect(spawn).toHaveBeenCalledWith('pnpm', ['exec', 'vite', 'build'], { cwd: root });
    expect(result.stderr).toBe('');
    expect(lastReceipt(result.stdout)).toMatchObject({
      status: 'ok',
      command: 'build',
      host: 'vite',
      exitCode: 0,
    });
  });

  it('returns the child nonzero exit and emits a failed BuildReceipt', async () => {
    const root = fixture('liteship.config.ts', 'astro.config.mjs');
    const spawn = vi.fn(async () => ({ exitCode: 23, stderrTail: 'host build failed' }));
    const run = createBuildCommand(spawn);
    const result = await captureCli(() => run({ cwd: root }));

    expect(result.exit).toBe(23);
    expect(spawn).toHaveBeenCalledWith('pnpm', ['exec', 'astro', 'build'], { cwd: root });
    expect(result.stderr).toBe('');
    expect(lastReceipt(result.stdout)).toMatchObject({
      status: 'failed',
      command: 'build',
      host: 'astro',
      exitCode: 23,
    });
  });
});
