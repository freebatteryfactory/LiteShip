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

describe('gauntlet command (unit)', () => {
  it('dry-run emits the canonical phase list without spawning', async () => {
    const { result, stdout } = await captureStdout(() => gauntlet(true));
    expect(result).toBe(0);
    const receipt = JSON.parse(stdout.trim().split('\n').pop()!);
    expect(receipt.status).toBe('ok');
    expect(receipt.command).toBe('gauntlet');
    expect(receipt.dryRun).toBe(true);
    expect(Array.isArray(receipt.phases)).toBe(true);
    expect(receipt.phases.length).toBeGreaterThan(10);
    expect(receipt.phases).toContain('build');
    expect(receipt.phases).toContain('flex:verify');
  });

  it('dry-run phases are exactly the canonical projection (CUT D8 — no private CLI copy)', async () => {
    const { stdout } = await captureStdout(() => gauntlet(true));
    const receipt = JSON.parse(stdout.trim().split('\n').pop()!) as { phases: string[] };
    expect(receipt.phases).toEqual(gauntletPhaseLabels());
  });
});
