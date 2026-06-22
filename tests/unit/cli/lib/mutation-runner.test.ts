/**
 * The DETERMINISTIC per-mutant runner safety proof (Slice C, the avionics tier —
 * `czap check --ir --mutate`). The finally-restore is the SAFETY KEYSTONE: the runner
 * mutates REAL trust-spine source files in place, so a crash, a test failure, or an
 * infra fault must NEVER leave a mutated source on disk. This suite proves:
 *
 *  1. RESTORE ON PASS — a survived mutant (subprocess exit 0) → `failed: false`, and
 *     the original bytes are back on disk byte-for-byte.
 *  2. RESTORE ON FAIL — a killed mutant (subprocess exit 1) → `failed: true`, and the
 *     original bytes are restored.
 *  3. RESTORE ON INFRA THROW — a non-{0,1} exit / signal / spawn error → a tagged
 *     throw (NOT a false verdict), and the original bytes are STILL restored (the
 *     `finally` ran before the throw propagated).
 *  4. DETERMINISM — the SAME mutant evaluated twice yields the IDENTICAL verdict.
 *  5. WROTE THE MUTANT — the subprocess actually saw the mutated bytes (the runner
 *     wrote them before spawning), proving the verdict is about the mutation.
 *
 * The subprocess is INJECTED (a deterministic stub), so the proof is fast + flake-free
 * while exercising the REAL write/restore/verify path. The stub never touches the
 * filesystem — the runner's own write/restore is what is under test.
 *
 * @module
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { hasTag } from '@czap/error';
import {
  makeVitestMutationRunner,
  type MutationSubprocessResult,
  type MutationSubprocessSpawn,
} from '../../../../packages/cli/src/lib/mutation-runner.js';

const ORIGINAL = 'export const x = 1 >= 2;\n';
const MUTATED = 'export const x = 1 > 2;\n';

let root: string;
const TARGET = 'seam.ts';

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'czap-mutrunner-'));
  writeFileSync(join(root, TARGET), ORIGINAL, 'utf8');
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

/** A stub spawn that returns a fixed outcome — no filesystem touch. */
function stubSpawn(outcome: MutationSubprocessResult): MutationSubprocessSpawn {
  return () => outcome;
}

describe('makeVitestMutationRunner — the per-mutant safety + determinism proof', () => {
  it('restores the original bytes on PASS (exit 0 → survived → failed:false)', () => {
    const runner = makeVitestMutationRunner(root, {
      targetFile: TARGET,
      spawn: stubSpawn({ status: 0, signal: null, stderr: '' }),
    });
    const verdict = runner(MUTATED, ['tests/x.test.ts']);
    expect(verdict.failed).toBe(false);
    // The keystone: the original bytes are back, byte-for-byte.
    expect(readFileSync(join(root, TARGET), 'utf8')).toBe(ORIGINAL);
  });

  it('restores the original bytes on FAIL (exit 1 → killed → failed:true)', () => {
    const runner = makeVitestMutationRunner(root, {
      targetFile: TARGET,
      spawn: stubSpawn({ status: 1, signal: null, stderr: '' }),
    });
    const verdict = runner(MUTATED, ['tests/x.test.ts']);
    expect(verdict.failed).toBe(true);
    expect(readFileSync(join(root, TARGET), 'utf8')).toBe(ORIGINAL);
  });

  it('the subprocess SAW the mutated bytes (the runner wrote them before spawning)', () => {
    let observed: string | undefined;
    const spy: MutationSubprocessSpawn = (repoRoot) => {
      // Read the target AT SPAWN TIME — it must hold the mutation, not the original.
      observed = readFileSync(join(repoRoot, TARGET), 'utf8');
      return { status: 0, signal: null, stderr: '' };
    };
    const runner = makeVitestMutationRunner(root, { targetFile: TARGET, spawn: spy });
    runner(MUTATED, ['tests/x.test.ts']);
    expect(observed).toBe(MUTATED);
    // And it is restored afterwards.
    expect(readFileSync(join(root, TARGET), 'utf8')).toBe(ORIGINAL);
  });

  it('throws a tagged IoError on a non-{0,1} exit AND still restores (infra fault, not a verdict)', () => {
    const runner = makeVitestMutationRunner(root, {
      targetFile: TARGET,
      spawn: stubSpawn({ status: 2, signal: null, stderr: 'config error' }),
    });
    expect(() => runner(MUTATED, ['tests/x.test.ts'])).toThrow();
    try {
      runner(MUTATED, ['tests/x.test.ts']);
    } catch (err) {
      expect(hasTag(err, 'IoError')).toBe(true);
    }
    // The finally ran before the throw propagated — the source is NOT left mutated.
    expect(readFileSync(join(root, TARGET), 'utf8')).toBe(ORIGINAL);
  });

  it('throws on a signal kill (the timeout path) AND still restores', () => {
    const runner = makeVitestMutationRunner(root, {
      targetFile: TARGET,
      spawn: stubSpawn({ status: null, signal: 'SIGTERM', stderr: '' }),
    });
    expect(() => runner(MUTATED, ['tests/x.test.ts'])).toThrow();
    expect(readFileSync(join(root, TARGET), 'utf8')).toBe(ORIGINAL);
  });

  it('throws on a spawn-level error AND still restores', () => {
    const runner = makeVitestMutationRunner(root, {
      targetFile: TARGET,
      spawn: stubSpawn({ status: null, signal: null, error: new Error('ENOENT'), stderr: null }),
    });
    expect(() => runner(MUTATED, ['tests/x.test.ts'])).toThrow();
    expect(readFileSync(join(root, TARGET), 'utf8')).toBe(ORIGINAL);
  });

  it('is DETERMINISTIC — the same mutant evaluated twice yields the identical verdict', () => {
    const runner = makeVitestMutationRunner(root, {
      targetFile: TARGET,
      spawn: stubSpawn({ status: 0, signal: null, stderr: '' }),
    });
    const first = runner(MUTATED, ['tests/x.test.ts']);
    const second = runner(MUTATED, ['tests/x.test.ts']);
    expect(second).toEqual(first);
    expect(readFileSync(join(root, TARGET), 'utf8')).toBe(ORIGINAL);
  });

  it('refuses to run (tagged throw) when the target source cannot be read', () => {
    const runner = makeVitestMutationRunner(root, {
      targetFile: 'does-not-exist.ts',
      spawn: stubSpawn({ status: 0, signal: null, stderr: '' }),
    });
    expect(() => runner(MUTATED, ['tests/x.test.ts'])).toThrow();
  });
});
