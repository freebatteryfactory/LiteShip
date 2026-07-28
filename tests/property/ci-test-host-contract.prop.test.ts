/** Property laws for exact CI baseline and host-capability preparation. @module */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { ZERO_SHA, ffmpegInstallPlan, standardsBaseTarget } from '../../scripts/lib/ci-test-host-contract.js';

const hexSha = fc
  .array(fc.constantFrom(...'0123456789abcdef'), { minLength: 40, maxLength: 40 })
  .map((digits) => digits.join(''))
  .filter((sha) => sha !== ZERO_SHA);

const branchName = fc
  .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-_/'), { minLength: 1, maxLength: 48 })
  .map((characters) => characters.join(''));

describe('CI test-host policy properties', () => {
  it('an exact review SHA always dominates the branch fallback without transformation', () => {
    fc.assert(
      fc.property(hexSha, branchName, (sha, branch) => {
        const target = standardsBaseTarget({ baseSha: sha, baseRef: branch });
        expect(target.ref).toBe(sha);
        expect(target.fetchArgs).toEqual(['fetch', '--no-tags', '--depth=1', 'origin', sha]);
      }),
      { numRuns: 200 },
    );
  });

  it('zero or whitespace SHA inputs deterministically select the named branch', () => {
    fc.assert(
      fc.property(branchName, fc.constantFrom(ZERO_SHA, '', '   '), (branch, sha) => {
        const target = standardsBaseTarget({ baseSha: sha, baseRef: branch });
        expect(target.ref).toBe(`origin/${branch}`);
        expect(target.fetchArgs.at(-1)).toBe(branch);
      }),
      { numRuns: 200 },
    );
  });

  it('every supported install plan is argv-only, deterministic, and non-empty', () => {
    fc.assert(
      fc.property(fc.constantFrom<NodeJS.Platform>('linux', 'darwin', 'win32'), (platform) => {
        const first = ffmpegInstallPlan(platform);
        const second = ffmpegInstallPlan(platform);
        expect(first).toEqual(second);
        expect(first.length).toBeGreaterThan(0);
        for (const command of first) {
          expect(command.command.trim()).not.toBe('');
          expect(command.args.length).toBeGreaterThan(0);
          expect(command.args.every((argument) => !/[;&|]/u.test(argument))).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });
});
