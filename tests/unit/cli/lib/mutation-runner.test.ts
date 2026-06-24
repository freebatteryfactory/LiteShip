/**
 * The DETERMINISTIC per-mutant runner safety proof (Slice C, the avionics tier —
 * `czap check --ir --mutate`). Two keystones:
 *
 * THE RESTORE KEYSTONE — the runner mutates REAL trust-spine source files in place, so
 * a crash, a test failure, or an infra fault must NEVER leave a mutated source on disk.
 *
 * THE VERDICT KEYSTONE (the CACError scar made permanent) — the verdict is keyed on
 * vitest's CONFIRMED `--reporter=json` report, NEVER a bare exit code. The scar: a
 * runner that read "exit 1 = killed" misread a removed-CLI-flag rejection (CAC exits 1,
 * emits no JSON report) as a kill — a fabricated score from a run that executed zero
 * tests. So a verdict is minted ONLY when a report PARSES, ≥1 test ACTUALLY EXECUTED,
 * and the exit code AGREES with the report; every other outcome is a tagged throw.
 *
 * This suite proves:
 *  1. RESTORE + VERDICT ON PASS — a survived mutant (report: tests ran, 0 failed; exit
 *     0) → `failed: false`, original bytes restored byte-for-byte.
 *  2. RESTORE + VERDICT ON FAIL — a killed mutant (report: ≥1 failed; exit 1) →
 *     `failed: true`, original bytes restored.
 *  3. RESTORE ON INFRA THROW — signal / spawn error → a tagged throw (NOT a false
 *     verdict), original bytes STILL restored (the `finally` ran first).
 *  4. THE CACError GUARD — a flag-rejection-style run (exit 1, NO parseable report)
 *     THROWS, never a false kill. The regression test for the scar.
 *  5. THE FALSE-SURVIVOR GUARD — a run that executed 0 tests (report: numTotalTests 0)
 *     THROWS, never a false survived (the mutant was never exercised).
 *  6. THE DISAGREEMENT GUARD — an exit code that contradicts the report THROWS.
 *  7. DETERMINISM — the SAME mutant evaluated twice yields the IDENTICAL verdict.
 *  8. WROTE THE MUTANT — the subprocess actually saw the mutated bytes.
 *
 * The subprocess is INJECTED (a deterministic stub), so the proof is fast + flake-free
 * while exercising the REAL write/restore/verify + verdict path. The stub never touches
 * the filesystem — the runner's own write/restore is what is under test.
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

/** Vitest `--reporter=json` stdout with the given confirmed test counts (Jest-shaped). */
function jsonReport(total: number, failed: number): string {
  return JSON.stringify({
    numTotalTests: total,
    numFailedTests: failed,
    numPassedTests: total - failed,
    success: failed === 0,
  });
}

describe('makeVitestMutationRunner — the per-mutant safety + verdict proof', () => {
  it('restores the original bytes on PASS (report: tests ran, 0 failed; exit 0 → survived)', () => {
    const runner = makeVitestMutationRunner(root, {
      targetFile: TARGET,
      spawn: stubSpawn({ status: 0, signal: null, stdout: jsonReport(3, 0), stderr: '' }),
    });
    const verdict = runner(MUTATED, ['tests/x.test.ts']);
    expect(verdict.failed).toBe(false);
    // The keystone: the original bytes are back, byte-for-byte.
    expect(readFileSync(join(root, TARGET), 'utf8')).toBe(ORIGINAL);
  });

  it('restores the original bytes on FAIL (report: 1 failed; exit 1 → killed)', () => {
    const runner = makeVitestMutationRunner(root, {
      targetFile: TARGET,
      spawn: stubSpawn({ status: 1, signal: null, stdout: jsonReport(3, 1), stderr: '' }),
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
      return { status: 0, signal: null, stdout: jsonReport(2, 0), stderr: '' };
    };
    const runner = makeVitestMutationRunner(root, { targetFile: TARGET, spawn: spy });
    runner(MUTATED, ['tests/x.test.ts']);
    expect(observed).toBe(MUTATED);
    // And it is restored afterwards.
    expect(readFileSync(join(root, TARGET), 'utf8')).toBe(ORIGINAL);
  });

  it('THE CACError GUARD: a flag-rejection run (exit 1, NO parseable report) THROWS, never a false kill', () => {
    // The exact scar: vitest rejected an unknown CLI flag → exit 1, no JSON report. A
    // runner keying on the exit code would mint a KILL. This one refuses: no report =
    // infra fault, not a verdict.
    const runner = makeVitestMutationRunner(root, {
      targetFile: TARGET,
      spawn: stubSpawn({
        status: 1,
        signal: null,
        stdout: 'CACError: Unknown option `--poolOptions.forks.singleFork`\n',
        stderr: 'error: unknown option',
      }),
    });
    expect(() => runner(MUTATED, ['tests/x.test.ts'])).toThrow();
    try {
      runner(MUTATED, ['tests/x.test.ts']);
    } catch (err) {
      expect(hasTag(err, 'IoError')).toBe(true);
    }
    // No false verdict was minted AND the source is restored.
    expect(readFileSync(join(root, TARGET), 'utf8')).toBe(ORIGINAL);
  });

  it('THE FALSE-SURVIVOR GUARD: a 0-test run (report numTotalTests 0, exit 0) THROWS, never a false survived', () => {
    // vitest exits 0 when "no test files matched" — a runner trusting the exit code
    // would mint a SURVIVOR for a mutant nothing tested. This one refuses.
    const runner = makeVitestMutationRunner(root, {
      targetFile: TARGET,
      spawn: stubSpawn({ status: 0, signal: null, stdout: jsonReport(0, 0), stderr: '' }),
    });
    expect(() => runner(MUTATED, ['tests/x.test.ts'])).toThrow();
    try {
      runner(MUTATED, ['tests/x.test.ts']);
    } catch (err) {
      expect(hasTag(err, 'IoError')).toBe(true);
    }
    expect(readFileSync(join(root, TARGET), 'utf8')).toBe(ORIGINAL);
  });

  it('THE DISAGREEMENT GUARD: exit code contradicting the report (report 1 failed, exit 0) THROWS', () => {
    const runner = makeVitestMutationRunner(root, {
      targetFile: TARGET,
      spawn: stubSpawn({ status: 0, signal: null, stdout: jsonReport(3, 1), stderr: '' }),
    });
    expect(() => runner(MUTATED, ['tests/x.test.ts'])).toThrow();
    expect(readFileSync(join(root, TARGET), 'utf8')).toBe(ORIGINAL);
  });

  it('throws on a signal kill (the timeout path) AND still restores', () => {
    const runner = makeVitestMutationRunner(root, {
      targetFile: TARGET,
      spawn: stubSpawn({ status: null, signal: 'SIGTERM', stdout: null, stderr: '' }),
    });
    expect(() => runner(MUTATED, ['tests/x.test.ts'])).toThrow();
    expect(readFileSync(join(root, TARGET), 'utf8')).toBe(ORIGINAL);
  });

  it('throws on a spawn-level error AND still restores', () => {
    const runner = makeVitestMutationRunner(root, {
      targetFile: TARGET,
      spawn: stubSpawn({ status: null, signal: null, error: new Error('ENOENT'), stdout: null, stderr: null }),
    });
    expect(() => runner(MUTATED, ['tests/x.test.ts'])).toThrow();
    expect(readFileSync(join(root, TARGET), 'utf8')).toBe(ORIGINAL);
  });

  it('is DETERMINISTIC — the same mutant evaluated twice yields the identical verdict', () => {
    const runner = makeVitestMutationRunner(root, {
      targetFile: TARGET,
      spawn: stubSpawn({ status: 0, signal: null, stdout: jsonReport(2, 0), stderr: '' }),
    });
    const first = runner(MUTATED, ['tests/x.test.ts']);
    const second = runner(MUTATED, ['tests/x.test.ts']);
    expect(second).toEqual(first);
    expect(readFileSync(join(root, TARGET), 'utf8')).toBe(ORIGINAL);
  });

  it('refuses to run (tagged throw) when the target source cannot be read', () => {
    const runner = makeVitestMutationRunner(root, {
      targetFile: 'does-not-exist.ts',
      spawn: stubSpawn({ status: 0, signal: null, stdout: jsonReport(1, 0), stderr: '' }),
    });
    expect(() => runner(MUTATED, ['tests/x.test.ts'])).toThrow();
  });
});
