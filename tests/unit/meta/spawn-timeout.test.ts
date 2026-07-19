/**
 * CUT test-flake — `spawnArgvCapture` honors an optional `timeoutMs` bound.
 *
 * The doctor flake root cause was unbounded subprocess probes: a slow/wedged/
 * contended `pnpm`/`cargo`/`git` could hang the caller past the test timeout. The
 * fix adds an OPTIONAL `timeoutMs` to the shared spawn helper. These tests pin the
 * contract: a slow child is killed and resolves `timedOut: true` (never hangs,
 * never rejects); default behavior is unchanged when `timeoutMs` is omitted; and a
 * timeout is distinguishable from a normal nonzero exit.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { spawnArgvCapture } from '@liteship/command/host';

describe('spawnArgvCapture — optional timeoutMs bound (CUT test-flake)', () => {
  it('a slow child is killed and resolves with timedOut:true (not a hang, not a throw)', async () => {
    const start = Date.now();
    // A child that would otherwise live 30s; bound it to 250ms.
    const r = await spawnArgvCapture('node', ['-e', 'setTimeout(() => {}, 30_000)'], { timeoutMs: 250 });
    const elapsed = Date.now() - start;
    expect(r.timedOut).toBe(true);
    expect(r.exitCode).toBe(124); // conventional "killed by timeout" code
    expect(elapsed).toBeLessThan(5_000); // resolved promptly, nowhere near the child's 30s
  });

  it('a fast child under a generous timeout resolves normally (timeout does not fire spuriously)', async () => {
    const r = await spawnArgvCapture('node', ['-e', 'process.stdout.write("ok")'], { timeoutMs: 10_000 });
    expect(r.timedOut).toBeFalsy();
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toBe('ok');
  });

  it('without timeoutMs, behavior is unchanged (resolves on close)', async () => {
    const r = await spawnArgvCapture('node', ['-e', 'process.stdout.write("plain")']);
    expect(r.timedOut).toBeFalsy();
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toBe('plain');
  });

  it('a timeout is distinguishable from a normal nonzero exit', async () => {
    const exited = await spawnArgvCapture('node', ['-e', 'process.exit(3)'], { timeoutMs: 10_000 });
    expect(exited.exitCode).toBe(3);
    expect(exited.timedOut).toBeFalsy(); // a real nonzero exit, NOT a timeout
  });
});
