/**
 * Anti-rot gates for two hand-maintained lists in the root package.json that
 * silently drifted before:
 *   1. the `pnpm scripts` deck-plan categories (scripts/lib/script-categories.ts)
 *      must cover every script in package.json — no script falls into the
 *      "other (uncategorized)" bucket;
 *   2. the `build` script's explicit `tsc --build` package list must match the
 *      set of publishable packages (minus type-only spines that don't compile).
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { CATEGORIES, LIFECYCLE_SCRIPTS } from '../../../scripts/lib/script-categories.js';

const REPO = resolve(import.meta.dirname, '..', '..', '..');
const rootPkg = JSON.parse(readFileSync(resolve(REPO, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};

describe('scripts-index parity — every root script is categorized', () => {
  const categorized = new Set(CATEGORIES.flatMap((c) => c.scripts));
  const lifecycle = new Set<string>(LIFECYCLE_SCRIPTS);

  it('no script in package.json lands in the uncategorized "other" bucket', () => {
    const uncategorized = Object.keys(rootPkg.scripts).filter((s) => !categorized.has(s) && !lifecycle.has(s));
    expect(uncategorized, `add these to scripts/lib/script-categories.ts: ${uncategorized.join(', ')}`).toEqual([]);
  });

  it('no category lists a script that no longer exists in package.json', () => {
    const present = new Set(Object.keys(rootPkg.scripts));
    const ghosts = [...categorized].filter((s) => !present.has(s));
    expect(ghosts, `these categorized scripts are gone from package.json: ${ghosts.join(', ')}`).toEqual([]);
  });
});

describe('build-list parity — the build script compiles every publishable package', () => {
  /** Publishable packages with no compile step (type-only declaration spines). */
  const NO_BUILD = new Set(['@czap/_spine']);

  const publishableDirs = readdirSync(resolve(REPO, 'packages')).filter((dir) => {
    let pkg: { name?: string; publishConfig?: unknown };
    try {
      pkg = JSON.parse(readFileSync(resolve(REPO, 'packages', dir, 'package.json'), 'utf8'));
    } catch {
      return false;
    }
    return pkg.publishConfig != null && pkg.name != null && !NO_BUILD.has(pkg.name);
  });

  const buildDirs = [...rootPkg.scripts.build!.matchAll(/packages\/([\w-]+)/g)].map((m) => m[1]!);

  it('the `tsc --build` list is exactly the buildable publishable packages', () => {
    expect([...buildDirs].sort()).toEqual([...publishableDirs].sort());
  });

  it('lists no package directory twice', () => {
    expect(buildDirs.length).toBe(new Set(buildDirs).size);
  });
});

describe('release:notes — version is not hardcoded', () => {
  it('the release:notes script derives the version (no `--version X.Y.Z` literal)', () => {
    expect(rootPkg.scripts['release:notes'] ?? '').not.toMatch(/--version\s+\d/);
  });
});
