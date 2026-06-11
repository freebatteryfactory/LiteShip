/**
 * Unit test for `gauntlet` command. The --dry-run path runs in-process;
 * the live path's spawnSync is mocked (the real `pnpm run gauntlet:full`
 * is far too heavy for a unit test and is covered by the gauntlet suite
 * itself) so the exit-status arms — success receipt, nonzero status, and
 * signal death — are still proven.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const { spawnSyncMock } = vi.hoisted(() => ({ spawnSyncMock: vi.fn() }));
vi.mock('node:child_process', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  spawnSync: spawnSyncMock,
}));

import { gauntlet } from '../../../../packages/cli/src/commands/gauntlet.js';
import { gauntletPhaseLabels } from '../../../../packages/cli/src/gauntlet-phases.js';

afterEach(() => {
  spawnSyncMock.mockReset();
});

async function captureStdout<T>(fn: () => Promise<T>): Promise<{ result: T; stdout: string }> {
  let stdout = '';
  const orig = process.stdout.write.bind(process.stdout);
  (process.stdout as unknown as { write: unknown }).write = ((c: string | Uint8Array) => {
    stdout += typeof c === 'string' ? c : Buffer.from(c).toString();
    return true;
  });
  try {
    const result = await fn();
    return { result, stdout };
  } finally {
    (process.stdout as unknown as { write: typeof orig }).write = orig;
  }
}

async function captureStderr<T>(fn: () => Promise<T>): Promise<{ result: T; stderr: string }> {
  let stderr = '';
  const orig = process.stderr.write.bind(process.stderr);
  (process.stderr as unknown as { write: unknown }).write = ((c: string | Uint8Array) => {
    stderr += typeof c === 'string' ? c : Buffer.from(c).toString();
    return true;
  });
  try {
    const result = await fn();
    return { result, stderr };
  } finally {
    (process.stderr as unknown as { write: typeof orig }).write = orig;
  }
}

describe('gauntlet command (unit)', () => {
  it('dry-run emits the canonical phase list without spawning', async () => {
    const { result, stdout } = await captureStdout(() => gauntlet(['--dry-run']));
    expect(result).toBe(0);
    const receipt = JSON.parse(stdout.trim().split('\n').pop()!);
    expect(receipt.status).toBe('ok');
    expect(receipt.command).toBe('gauntlet');
    expect(receipt.dryRun).toBe(true);
    expect(receipt.argvPolicy).toBe('reject-unknown');
    expect(Array.isArray(receipt.phases)).toBe(true);
    expect(receipt.phases.length).toBeGreaterThan(10);
    expect(receipt.phases).toContain('build');
    expect(receipt.phases).toContain('flex:verify');
    expect(receipt.phases[0]).toBe('rig-check');
  });

  it('dry-run phases are exactly the canonical projection (CUT D8 — no private CLI copy)', async () => {
    const { stdout } = await captureStdout(() => gauntlet(['--dry-run']));
    const receipt = JSON.parse(stdout.trim().split('\n').pop()!) as { phases: string[] };
    expect(receipt.phases).toEqual(gauntletPhaseLabels());
  });

  it('rejects unexpected argv with exit 1 and a structured receipt', async () => {
    const { result, stderr } = await captureStderr(() => gauntlet(['foo']));
    expect(result).toBe(1);
    const receipt = JSON.parse(stderr.trim().split('\n')[0]!);
    expect(receipt.status).toBe('failed');
    expect(receipt.command).toBe('gauntlet');
    expect(receipt.error).toBe('unexpected_argv');
    expect(receipt.argv).toEqual(['foo']);
  });

  it('rejects the paste-trap argv shape from pasted comments', async () => {
    const { result, stderr } = await captureStderr(() =>
      gauntlet(['#', 'your', 'local', 'terminal', '—', 'should', 'pass', 'render', 'tests', 'now']),
    );
    expect(result).toBe(1);
    const receipt = JSON.parse(stderr.trim().split('\n')[0]!);
    expect(receipt.error).toBe('unexpected_argv');
    expect(receipt.argv[0]).toBe('#');
  });

  it('refuses the live run outside the LiteShip workspace without spawning anything', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'czap-gauntlet-guard-'));
    try {
      writeFileSync(join(tmp, 'package.json'), JSON.stringify({ name: 'stranger-project', version: '0.0.0' }));
      const { result, stderr } = await captureStderr(() => gauntlet([], { cwd: tmp }));
      expect(result).toBe(1);
      expect(spawnSyncMock).not.toHaveBeenCalled();
      const receipt = JSON.parse(stderr.trim().split('\n')[0]!);
      expect(receipt.status).toBe('failed');
      expect(receipt.error).toMatch(/LiteShip-workspace verb/);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('live run (spawn mocked, exit 0) emits an ok receipt with elapsedMs', async () => {
    spawnSyncMock.mockReturnValue({ status: 0 });
    const { result, stdout } = await captureStdout(() => gauntlet([]));
    expect(result).toBe(0);
    expect(spawnSyncMock).toHaveBeenCalledWith('pnpm', ['run', 'gauntlet:full'], {
      stdio: 'inherit',
      shell: true,
      cwd: process.cwd(),
    });
    const receipt = JSON.parse(stdout.trim().split('\n').pop()!);
    expect(receipt.status).toBe('ok');
    expect(receipt.dryRun).toBe(false);
    expect(typeof receipt.elapsedMs).toBe('number');
  });

  it('live run failure propagates the gauntlet exit status', async () => {
    spawnSyncMock.mockReturnValue({ status: 7 });
    const { result, stderr } = await captureStderr(() => gauntlet([]));
    expect(result).toBe(7);
    const receipt = JSON.parse(stderr.trim().split('\n')[0]!);
    expect(receipt.status).toBe('failed');
    expect(receipt.error).toBe('gauntlet exited with status 7');
  });

  it('live run killed by a signal (status null) reports signal and exits 1', async () => {
    spawnSyncMock.mockReturnValue({ status: null });
    const { result, stderr } = await captureStderr(() => gauntlet([]));
    expect(result).toBe(1);
    const receipt = JSON.parse(stderr.trim().split('\n')[0]!);
    expect(receipt.error).toBe('gauntlet exited with status signal');
  });
});
