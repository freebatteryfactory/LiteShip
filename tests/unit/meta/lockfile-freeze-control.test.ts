/**
 * Frozen-lockfile resolution — negative control for `check/lockfile-frozen`.
 *
 * CI run 30210940212 failed `pnpm install --frozen-lockfile` on a clean
 * runner with ERR_PNPM_LOCKFILE_MISSING_DEPENDENCY while every warm local
 * install kept passing (the warm store masks a drifted lockfile). The gate
 * (`pnpm run lockfile:gate` = `pnpm install --frozen-lockfile
 * --lockfile-only --ignore-scripts`) runs pnpm's resolution validation without
 * touching node_modules or invoking lifecycle code. This control proves the command actually fails on a broken
 * lockfile — offline, in a synthetic single-package workspace — so the gate
 * can never rot into ceremony.
 *
 * @module
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnArgvCapture } from '@liteship/command/host';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { scaledTimeout } from '../../../vitest.shared.js';

let ROOT = '';

beforeAll(() => {
  ROOT = mkdtempSync(join(tmpdir(), 'liteship-lockfreeze-'));
});

afterAll(() => {
  rmSync(ROOT, { recursive: true, force: true });
});

describe('frozen lockfile resolution control', () => {
  it(
    'RED (cure packet, run 30210940212): a manifest dependency missing from the lockfile fails frozen resolution offline',
    { timeout: scaledTimeout(60_000) },
    async () => {
      writeFileSync(
        join(ROOT, 'package.json'),
        JSON.stringify({ name: 'red-fixture', private: true, dependencies: { 'left-pad': '1.3.0' } }, null, 2),
        'utf8',
      );
      writeFileSync(
        join(ROOT, 'pnpm-lock.yaml'),
        [
          "lockfileVersion: '9.0'",
          'settings:',
          '  autoInstallPeers: true',
          '  excludeLinksFromLockfile: false',
          'importers:',
          '  .: {}',
          '',
        ].join('\n'),
        'utf8',
      );
      const result = await spawnArgvCapture(
        'pnpm',
        ['install', '--frozen-lockfile', '--lockfile-only', '--ignore-scripts', '--offline', '--ignore-workspace'],
        { cwd: ROOT },
      );
      expect(result.exitCode).not.toBe(0);
      expect(`${result.stdout}\n${result.stderr}`).toMatch(/ERR_PNPM/u);
    },
  );
});
