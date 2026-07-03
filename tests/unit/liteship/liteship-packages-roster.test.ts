/**
 * Umbrella roster drift guard — `LITESHIP_PACKAGES` must match manifest deps.
 *
 * @module
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LITESHIP_PACKAGES } from '../../../packages/liteship/src/index.js';

const REPO = resolve(import.meta.dirname, '..', '..', '..');
const MANIFEST_PATH = resolve(REPO, 'packages/liteship/package.json');
const PACKAGES_DIR = resolve(REPO, 'packages');

function czapDependenciesFromManifest(): string[] {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as {
    dependencies?: Record<string, string>;
  };
  return Object.keys(manifest.dependencies ?? {})
    .filter((name) => name.startsWith('@czap/'))
    .sort();
}

/**
 * Every publishable `@czap/*` package on disk — release.yml's own predicate (`private
 * != true`), scoped to `@czap/*` (the umbrella can't depend on the non-scoped `liteship`
 * / `create-liteship`). The authoritative set the umbrella must cover.
 */
function derivePublishableCzapScopes(): string[] {
  const names: string[] = [];
  for (const entry of readdirSync(PACKAGES_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    let manifest: { name?: string; private?: boolean };
    try {
      manifest = JSON.parse(readFileSync(join(PACKAGES_DIR, entry.name, 'package.json'), 'utf8'));
    } catch {
      continue; // no manifest → not a package
    }
    if (manifest.private !== true && manifest.name?.startsWith('@czap/')) names.push(manifest.name);
  }
  return names.sort();
}

describe('liteship umbrella roster', () => {
  it('LITESHIP_PACKAGES matches every @czap/* dependency in package.json', () => {
    expect([...LITESHIP_PACKAGES].sort()).toEqual(czapDependenciesFromManifest());
  });

  it('covers EVERY publishable @czap/* on disk — the umbrella can never silently omit a new package', () => {
    // liteship is the 4th roster location (release.yml + package-smoke + capsule-detector
    // are the others), and its PROMISE is "installs every publishable @czap/* at one
    // version." The sibling guards pin their lists to the disk-derived publishable set;
    // this pins the umbrella's dependencies to the same source, so a newly-public @czap/*
    // package that isn't added to liteship fails loud here instead of shipping an
    // incomplete umbrella.
    expect(czapDependenciesFromManifest()).toEqual(derivePublishableCzapScopes());
  });

  it('includes framework primitive packages', () => {
    expect(LITESHIP_PACKAGES).toContain('@czap/canonical');
    expect(LITESHIP_PACKAGES).toContain('@czap/genui');
  });
});
