/**
 * Candidate-worktree tracked-file census regressions.
 *
 * @module
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { walkTrackedFiles } from '../../../scripts/audit/shared.js';
import { spawnArgv } from '../../../scripts/lib/spawn.js';

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('walkTrackedFiles', () => {
  it('does not expose a tracked path deleted from the candidate worktree', async () => {
    const root = mkdtempSync(join(tmpdir(), 'liteship-tracked-census-'));
    roots.push(root);
    const live = join(root, 'live.ts');
    const retired = join(root, 'retired.ts');
    writeFileSync(live, 'export const live = true;\n');
    writeFileSync(retired, 'export const retired = true;\n');
    expect((await spawnArgv('git', ['init'], { cwd: root, stdio: ['ignore', 'ignore', 'pipe'] })).exitCode).toBe(0);
    expect((await spawnArgv('git', ['add', '.'], { cwd: root, stdio: ['ignore', 'ignore', 'pipe'] })).exitCode).toBe(0);
    rmSync(retired);

    expect(walkTrackedFiles(root)).toEqual(['live.ts']);
  });
});
