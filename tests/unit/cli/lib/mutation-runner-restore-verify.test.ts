/**
 * The VERIFICATION-READ keystone (PR #192 review, confirmed P1): the restore's
 * post-write read is as load-bearing as the write itself. If it throws (target
 * concurrently deleted / unreadable), the restore was never CONFIRMED — and an
 * UNMARKED fs error would fold to an `inconclusive` verdict, letting the
 * campaign continue over a working tree in unknown state. The throw must carry
 * the `campaignFatal` abort marker exactly like a failed write or a byte
 * mismatch.
 *
 * Isolated in its own file: the fs mock scopes the failure to the SECOND read
 * of the target (read 1 = the pre-mutation backup; read 2 = the post-restore
 * verify), which cannot be staged portably with the real filesystem.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as fsModule from 'node:fs';

const verifyReadDenied = { active: false, targetReads: 0 };

vi.mock('node:fs', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof fsModule;
  return {
    ...actual,
    readFileSync: ((path: unknown, ...rest: unknown[]) => {
      if (verifyReadDenied.active && String(path).endsWith('seam.ts')) {
        verifyReadDenied.targetReads += 1;
        if (verifyReadDenied.targetReads > 1) {
          throw Object.assign(new Error('EIO: verification read denied'), { code: 'EIO' });
        }
      }
      return (actual.readFileSync as (...a: unknown[]) => unknown)(path, ...rest);
    }) as typeof actual.readFileSync,
  };
});

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { hasTag } from '@liteship/error';
import { makeVitestMutationRunner } from '../../../../packages/cli/src/internal/mutation-runner.js';

const ORIGINAL = 'export const x = 1 >= 2;\n';
const MUTATED = 'export const x = 1 > 2;\n';
const TARGET = 'seam.ts';

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'liteship-mutverify-'));
  writeFileSync(join(root, TARGET), ORIGINAL, 'utf8');
  verifyReadDenied.active = true;
  verifyReadDenied.targetReads = 0;
});
afterEach(() => {
  verifyReadDenied.active = false;
  rmSync(root, { recursive: true, force: true });
});

describe('makeVitestMutationRunner — the verification-read keystone', () => {
  it('a post-restore verification-read failure is campaignFatal, never a foldable per-mutant refusal', () => {
    const runner = makeVitestMutationRunner(root, {
      targetFile: TARGET,
      spawn: () => ({
        status: 0,
        signal: null,
        stdout: JSON.stringify({ numTotalTests: 3, numFailedTests: 0, numPassedTests: 3, success: true }),
        stderr: '',
      }),
    });
    try {
      runner(MUTATED, ['tests/x.test.ts']);
      expect.unreachable('an unverifiable restore must throw');
    } catch (error) {
      expect(hasTag(error, 'IoError')).toBe(true);
      expect((error as { detail?: string }).detail).toMatch(/could not be VERIFIED/u);
      expect((error as { campaignFatal?: boolean }).campaignFatal).toBe(true);
    }
  });
});
