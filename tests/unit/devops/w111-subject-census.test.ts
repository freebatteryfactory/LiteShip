/**
 * W1.11 subject-census laws.
 *
 * The shipped scaffold, package executables, and root tool configs are an
 * open tracked-file grammar. The census must derive them from one immutable
 * Git snapshot so a newly tracked subject cannot remain invisible behind a
 * maintained filename list.
 *
 * @module
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  W111_SUBJECT_FLOORS,
  buildW111SubjectCensus,
  createTrackedFileCensus,
  readTrackedFileCensus,
} from '../../../scripts/lib/tracked-subject-census.js';

const REPO_ROOT = resolve(import.meta.dirname, '..', '..', '..');

describe('W1.11 tracked subject census', () => {
  it('derives the complete live subjects and their complement from one tracked snapshot', async () => {
    const tracked = await readTrackedFileCensus(REPO_ROOT);
    const subjects = buildW111SubjectCensus(tracked, (path) => readFileSync(resolve(REPO_ROOT, path), 'utf8'));

    const independentlyDerivedFragments = tracked.paths.filter((path) => path.startsWith('packages/cli/fragments/'));
    expect(subjects.fragments).toEqual(independentlyDerivedFragments);
    expect(subjects.fragments.length).toBeGreaterThanOrEqual(W111_SUBJECT_FLOORS.fragments);
    expect(subjects.fragmentSources.length).toBeGreaterThanOrEqual(W111_SUBJECT_FLOORS.fragmentSources);
    expect(subjects.shippedBins.length).toBeGreaterThanOrEqual(W111_SUBJECT_FLOORS.shippedBins);
    expect(subjects.rootExecutableConfigs.length).toBeGreaterThanOrEqual(W111_SUBJECT_FLOORS.rootExecutableConfigs);

    expect([...subjects.fragmentSources, ...subjects.fragmentNonSources].sort()).toEqual(subjects.fragments);
    expect(new Set(subjects.governedSources).size).toBe(subjects.governedSources.length);
  });

  it('calls git ls-files -z exactly once and freezes the resulting paths', async () => {
    const runGit = vi.fn(async () => ({
      exitCode: 0,
      stdout: 'packages/cli/fragments/example/new/main.tsx\0packages/example/package.json\0',
      stderr: '',
    }));

    const tracked = await readTrackedFileCensus('/repo', runGit);

    expect(runGit).toHaveBeenCalledOnce();
    expect(runGit).toHaveBeenCalledWith('git', ['ls-files', '-z'], {
      cwd: '/repo',
      timeoutMs: 30_000,
      captureBytes: 4 * 1024 * 1024,
    });
    expect(tracked.paths).toEqual(['packages/cli/fragments/example/new/main.tsx', 'packages/example/package.json']);
    expect(Object.isFrozen(tracked.paths)).toBe(true);
    expect(Object.isFrozen(tracked)).toBe(true);
  });

  it('classifies newly tracked source/config subjects and resolves bins through their manifests', () => {
    const files = new Map<string, string>([
      ['packages/example/package.json', JSON.stringify({ bin: { example: './bin/example.mjs' } })],
    ]);
    const tracked = createTrackedFileCensus([
      'packages/cli/fragments/example/new/main.tsx',
      'packages/cli/fragments/example/new/notes.txt',
      'packages/example/bin/example.mjs',
      'packages/example/package.json',
      'vitest.future.ts',
    ]);

    const subjects = buildW111SubjectCensus(tracked, (path) => files.get(path) ?? '');

    expect(subjects.fragmentSources).toEqual(['packages/cli/fragments/example/new/main.tsx']);
    expect(subjects.fragmentNonSources).toEqual(['packages/cli/fragments/example/new/notes.txt']);
    expect(subjects.shippedBins).toEqual(['packages/example/bin/example.mjs']);
    expect(subjects.rootExecutableConfigs).toEqual(['vitest.future.ts']);
  });

  it('fails closed on an invalid tracked snapshot or an unreadable bin referent', () => {
    expect(() => createTrackedFileCensus(['packages/a.ts', 'packages/a.ts'])).toThrow(/duplicate tracked path/u);
    expect(() => createTrackedFileCensus(['../outside.ts'])).toThrow(/repo-relative/u);

    const tracked = createTrackedFileCensus(['packages/example/package.json']);
    expect(() => buildW111SubjectCensus(tracked, () => JSON.stringify({ bin: './bin/missing.mjs' }))).toThrow(
      /not present in the tracked census/u,
    );
  });
});
