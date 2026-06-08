/**
 * Unit test for `gauntlet` command. Only the --dry-run path is exercised
 * in-process — the live spawn path delegates to `pnpm run gauntlet:full`
 * which is far too heavy for a unit test (and is covered by the gauntlet
 * suite itself).
 */
import { describe, it, expect } from 'vitest';
import { gauntlet } from '../../../../packages/cli/src/commands/gauntlet.js';
import { gauntletPhaseLabels } from '../../../../packages/cli/src/gauntlet-phases.js';

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
});
