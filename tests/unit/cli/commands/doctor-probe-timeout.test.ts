/**
 * CUT test-flake — a timed-out external probe degrades to `warn`, and doctor stays
 * bounded (it never hangs on a slow/wedged subprocess).
 *
 * This is the regression test for the doctor parallel-load flake: under load the
 * serial `cargo`/`pnpm`/`git` spawns crossed the 10s test timeout. The fix bounds
 * each spawn (`timeoutMs`) and runs them concurrently; a bound that fires maps the
 * probe to `warn` ("didn't answer in time"), NOT `fail` (the workspace isn't broken
 * — the local tool was slow/contended).
 *
 * It lives in its OWN file because it mocks the spawn helper to force the timeout
 * path — the main doctor.test.ts keeps probing the LIVE workspace, unmocked.
 *
 * @module
 */
import { describe, it, expect, vi } from 'vitest';

// Force every external probe spawn down the timed-out path. Sync probes (node,
// workspace, built, hooks, playwright) still run live against the real workspace.
vi.mock('../../../../packages/cli/src/lib/spawn.js', () => ({
  spawnArgvCapture: vi.fn(async () => ({ exitCode: 124, stdout: '', stderr: '', timedOut: true })),
  spawnArgvVisible: vi.fn(async () => ({ exitCode: 0, stdout: '', stderr: '' })),
}));

import { doctor } from '../../../../packages/cli/src/commands/doctor.js';
import { captureCli } from '../../../integration/cli/capture.js';

describe('doctor — timed-out external probe → warn, bounded (CUT test-flake)', () => {
  it('completes (no hang) and emits the normal receipt shape when every spawn times out', async () => {
    const { stdout } = await captureCli(() => doctor({ pretty: false }));
    const receipt = JSON.parse(stdout.trim().split('\n').pop()!);
    expect(receipt.command).toBe('doctor');
    expect(['ok', 'failed']).toContain(receipt.status);
    expect(['ready', 'caution', 'blocked']).toContain(receipt.verdict);
    expect(Array.isArray(receipt.checks)).toBe(true);
    for (const check of receipt.checks) {
      expect(['ok', 'warn', 'fail']).toContain(check.status);
    }
  });

  it('the pnpm probe maps a timeout to warn (slow/contended), not fail (broken)', async () => {
    const { stdout } = await captureCli(() => doctor({ pretty: false }));
    const receipt = JSON.parse(stdout.trim().split('\n').pop()!);
    const pnpm = receipt.checks.find((c: { id: string }) => c.id === 'pnpm.version');
    expect(pnpm.status).toBe('warn');
    expect(pnpm.detail.toLowerCase()).toMatch(/response|timeout|slow|contended/);
  });

  it('the git.config probe maps a timeout to warn with a timeout-specific detail', async () => {
    const { stdout } = await captureCli(() => doctor({ pretty: false }));
    const receipt = JSON.parse(stdout.trim().split('\n').pop()!);
    const git = receipt.checks.find((c: { id: string }) => c.id === 'git.config');
    // Real repo cwd has a .git, so the probe spawns → mocked timeout → warn.
    expect(git.status).toBe('warn');
    expect(git.detail.toLowerCase()).toMatch(/respond|timeout|slow|contended/);
  });

  it('the wasm.toolchain probe (crates/ present) maps a timeout to warn, not a missing-cargo fail', async () => {
    const { stdout } = await captureCli(() => doctor({ pretty: false }));
    const receipt = JSON.parse(stdout.trim().split('\n').pop()!);
    const wasm = receipt.checks.find((c: { id: string }) => c.id === 'wasm.toolchain');
    expect(wasm).toBeDefined(); // repo has crates/liteship-compute
    expect(wasm.status).toBe('warn');
    expect(wasm.detail.toLowerCase()).toMatch(/respond|timeout|slow|contended/);
  });
});
