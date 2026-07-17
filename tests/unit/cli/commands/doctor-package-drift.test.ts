/**
 * Drift-guard: the package list the doctor's `--fix` invalidates
 * tsbuildinfo for must match the build topology. The root `build` script
 * is now a bare `tsc --build`, so that topology lives in root
 * tsconfig.json's project `references`, and `loadBuiltPackages` reads it
 * from there (mirroring tests/unit/devops/scripts-and-build-parity.test.ts).
 * This test pins that contract:
 *
 *   1. root tsconfig references parse into a non-empty package list;
 *   2. `loadBuiltPackages` returns exactly the reference-derived dirs — the
 *      invalidation set the doctor's `--fix` loop actually drives;
 *   3. every directory under `packages/` is referenced, and every reference
 *      exists on disk (no phantom, no forgotten package).
 *
 * The loop is dynamic, so adding a package to the root tsconfig references
 * auto-includes it in the doctor's invalidation set; this test asserts the
 * extraction itself stays sound (regex still matches, set of packages on
 * disk matches the referenced set).
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadBuiltPackages } from '../../../../packages/cli/src/commands/doctor/manifest.js';
import { rootTsconfigReferenceDirs } from '../../../support/repo-truths.js';

const REPO_ROOT = resolve(__dirname, '../../../..');

// References topology is owned by tests/support/repo-truths.ts (scar S0.4). This
// guard shares that truth with scripts-and-build-parity; the ASSERTIONS below are
// unchanged — only the reference-reading moved to the single owner.
const referenceDirs = rootTsconfigReferenceDirs;

function listOnDiskPackages(): readonly string[] {
  const entries = readdirSync(resolve(REPO_ROOT, 'packages'));
  return entries.filter((name) => {
    const full = resolve(REPO_ROOT, 'packages', name);
    return statSync(full).isDirectory();
  });
}

describe('doctor package-list drift guard', () => {
  it('root tsconfig references parse into a non-empty package list', () => {
    expect(referenceDirs().length).toBeGreaterThanOrEqual(14);
  });

  it('loadBuiltPackages returns exactly the root tsconfig reference dirs (the doctor invalidation set)', () => {
    expect(new Set(loadBuiltPackages(REPO_ROOT))).toEqual(new Set(referenceDirs()));
  });

  it('every directory under packages/ appears in the root tsconfig references', () => {
    const referenced = new Set(referenceDirs());
    const onDisk = listOnDiskPackages();

    const missing = onDisk.filter((p) => !referenced.has(p));
    expect(missing, `packages on disk but not in root tsconfig references: ${missing.join(', ')}`).toEqual([]);
  });

  it('every referenced package exists on disk', () => {
    const referenced = referenceDirs();
    const onDisk = new Set(listOnDiskPackages());

    const phantom = referenced.filter((p) => !onDisk.has(p));
    expect(phantom, `root tsconfig references with no directory: ${phantom.join(', ')}`).toEqual([]);
  });
});
