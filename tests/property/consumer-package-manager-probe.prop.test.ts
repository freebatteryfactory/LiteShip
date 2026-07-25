/**
 * Consumer package-manager probe laws.
 *
 * These properties guard the seam shared by `info`, `doctor`, and focused host
 * profiles. Detection chooses the executable; the subprocess result determines
 * only that executable's health. Neither the invoking shell nor an unrelated
 * installed manager may change the receipt.
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import fc from 'fast-check';
import { probeProjectPackageManager } from '../../packages/cli/src/commands/doctor/probes-workspace.js';

const roots: string[] = [];

function fixture(manager: string): string {
  const root = mkdtempSync(join(tmpdir(), 'liteship-manager-probe-prop-'));
  roots.push(root);
  writeFileSync(join(root, 'package.json'), JSON.stringify({ packageManager: manager }));
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

const supportedManager = fc.constantFrom('npm', 'pnpm');
const supportedMajor = fc.integer({ min: 10, max: 99 });
const minorOrPatch = fc.integer({ min: 0, max: 999 });
const validVersion = fc
  .tuple(supportedMajor, minorOrPatch, minorOrPatch)
  .map(([major, minor, patch]) => `${major}.${minor}.${patch}`);

describe('consumer package-manager probe properties', () => {
  it('executes exactly the manager named by authored ownership metadata', async () => {
    await fc.assert(
      fc.asyncProperty(supportedManager, validVersion, async (manager, version) => {
        const root = fixture(`${manager}@${version}`);
        const spawn = vi.fn(async () => ({
          exitCode: 0,
          stdout: `${version}\n`,
          stderr: '',
          timedOut: false,
        }));

        const result = await probeProjectPackageManager(root, { node: 22, pnpm: 10 }, spawn);

        expect(result.manager).toBe(manager);
        expect(result.check).toEqual({
          id: `${manager}.version`,
          label: manager,
          status: 'ok',
          detail: version,
        });
        expect(spawn).toHaveBeenCalledOnce();
        expect(spawn).toHaveBeenCalledWith(manager, ['--version'], { timeoutMs: 4_000 });
      }),
      { seed: 0x504d_0001, numRuns: 80 },
    );
  });

  it('classifies timeout independently of supported manager identity', async () => {
    await fc.assert(
      fc.asyncProperty(supportedManager, validVersion, async (manager, version) => {
        const root = fixture(`${manager}@${version}`);
        const spawn = vi.fn(async () => ({
          exitCode: 124,
          stdout: '',
          stderr: 'timed out',
          timedOut: true,
        }));

        const result = await probeProjectPackageManager(root, { node: 22, pnpm: 10 }, spawn);

        expect(result.manager).toBe(manager);
        expect(result.check).toMatchObject({
          id: `${manager}.version`,
          status: 'warn',
          detail: expect.stringContaining('no response within'),
        });
        expect(spawn).toHaveBeenCalledOnce();
      }),
      { seed: 0x504d_0002, numRuns: 60 },
    );
  });

  it('classifies nonzero exit independently of supported manager identity', async () => {
    await fc.assert(
      fc.asyncProperty(
        supportedManager,
        validVersion,
        fc.integer({ min: 1, max: 255 }),
        async (manager, version, exitCode) => {
          const root = fixture(`${manager}@${version}`);
          const spawn = vi.fn(async () => ({ exitCode, stdout: '', stderr: 'unavailable', timedOut: false }));

          const result = await probeProjectPackageManager(root, { node: 22, pnpm: 10 }, spawn);

          expect(result.manager).toBe(manager);
          expect(result.check).toMatchObject({
            id: `${manager}.version`,
            status: 'fail',
            detail: expect.stringContaining('not on PATH'),
          });
        },
      ),
      { seed: 0x504d_0003, numRuns: 60 },
    );
  });

  it('never spawns for an unsupported authored manager', async () => {
    const unsupported = fc
      .stringMatching(/^[a-z][a-z0-9-]{0,18}$/u)
      .filter((manager) => manager !== 'npm' && manager !== 'pnpm');

    await fc.assert(
      fc.asyncProperty(unsupported, validVersion, async (manager, version) => {
        const root = fixture(`${manager}@${version}`);
        const spawn = vi.fn(async () => ({ exitCode: 0, stdout: `${version}\n`, stderr: '', timedOut: false }));

        const result = await probeProjectPackageManager(root, { node: 22, pnpm: 10 }, spawn);

        expect(result.manager).toBeNull();
        expect(result.check).toMatchObject({
          id: 'package-manager.selection',
          status: 'fail',
          detail: expect.stringContaining(`unsupported ${manager} project`),
        });
        expect(spawn).not.toHaveBeenCalled();
      }),
      { seed: 0x504d_0004, numRuns: 80 },
    );
  });

  it('keeps a pnpm below-minimum refusal distinct from npm admission', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 0, max: 9 }), minorOrPatch, minorOrPatch, async (major, minor, patch) => {
        const version = `${major}.${minor}.${patch}`;
        const root = fixture(`pnpm@${version}`);
        const spawn = vi.fn(async () => ({ exitCode: 0, stdout: `${version}\n`, stderr: '', timedOut: false }));

        const result = await probeProjectPackageManager(root, { node: 22, pnpm: 10 }, spawn);

        expect(result).toMatchObject({
          manager: 'pnpm',
          check: {
            id: 'pnpm.version',
            status: 'fail',
            detail: expect.stringContaining('need >= 10'),
          },
        });
      }),
      { seed: 0x504d_0005, numRuns: 60 },
    );
  });
});
