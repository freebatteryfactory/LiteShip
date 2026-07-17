/**
 * Umbrella roster drift guard — `LITESHIP_PACKAGES` must match manifest deps.
 *
 * @module
 */
import { describe, expect, it } from 'vitest';
import { LITESHIP_PACKAGES } from '../../../packages/liteship/src/index.js';
import { packageManifests, packageRoster } from '../../support/repo-truths.js';

// The manifest truth (packages/*/package.json) and the canonical `@czap/*` roster
// are owned by tests/support/repo-truths.ts (scar S0.4). `packageRoster()` IS the
// non-private `@czap/*` fleet — the same predicate release.yml uses, scoped to
// `@czap/*` (the umbrella can't depend on the non-scoped `liteship` /
// `create-liteship`). This guard's ASSERTIONS are unchanged.

function czapDependenciesFromManifest(): string[] {
  const liteship = packageManifests().find((manifest) => manifest.dir === 'liteship');
  return Object.keys(liteship?.dependencies ?? {})
    .filter((name) => name.startsWith('@czap/'))
    .sort();
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
    expect(czapDependenciesFromManifest()).toEqual([...packageRoster()]);
  });

  it('includes framework primitive packages', () => {
    expect(LITESHIP_PACKAGES).toContain('@czap/canonical');
    expect(LITESHIP_PACKAGES).toContain('@czap/genui');
  });
});
