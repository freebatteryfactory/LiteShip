/**
 * Umbrella roster drift guard — `LITESHIP_PACKAGES` must match manifest deps.
 *
 * @module
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LITESHIP_PACKAGES } from '../../../packages/liteship/src/index.js';
import { CANONICAL_ROSTER, renderLiteshipPackages } from '../../../scripts/gen-roster.js';
import { packageManifests, packageRoster } from '../../support/repo-truths.js';

// The manifest truth (packages/*/package.json) and the canonical `@czap/*` roster
// are owned by tests/support/repo-truths.ts (scar S0.4). `packageRoster()` IS the
// non-private `@czap/*` fleet — the same predicate release.yml uses, scoped to
// `@czap/*` (the umbrella can't depend on the non-scoped `liteship` /
// `create-liteship`). This guard's ASSERTIONS are unchanged.

const LITESHIP_INDEX = resolve(import.meta.dirname, '..', '..', '..', 'packages/liteship/src/index.ts');

function czapDependenciesFromManifest(): string[] {
  const liteship = packageManifests().find((manifest) => manifest.dir === 'liteship');
  return Object.keys(liteship?.dependencies ?? {})
    .filter((name) => name.startsWith('@czap/'))
    .sort();
}

/** The exact text inside the `BEGIN/END gen-roster: LITESHIP_PACKAGES` markers. */
function generatedBlock(): string {
  const src = readFileSync(LITESHIP_INDEX, 'utf8');
  const match = /\/\* BEGIN gen-roster: LITESHIP_PACKAGES[^\n]*\*\/\n([\s\S]*?)\n\/\* END gen-roster: LITESHIP_PACKAGES/.exec(src);
  if (!match) throw new Error('packages/liteship/src/index.ts: BEGIN/END gen-roster: LITESHIP_PACKAGES markers not found');
  return match[1]!;
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

  // gen-roster (scripts/gen-roster.ts) is the single owner of the canonical
  // dependency-ordered `@czap/*` fleet; `LITESHIP_PACKAGES` is its tarball-shipped
  // mirror. These two assertions close the loop begun above (copy == repo-truths):
  // copy == gen-roster's roster, in the SAME order, and byte-for-byte the generator
  // output between the source's generated-block markers.
  it('LITESHIP_PACKAGES equals gen-roster CANONICAL_ROSTER in dependency order', () => {
    expect([...LITESHIP_PACKAGES]).toEqual([...CANONICAL_ROSTER]);
  });

  it('the generated-block source matches gen-roster renderLiteshipPackages() byte-for-byte', () => {
    expect(generatedBlock()).toBe(renderLiteshipPackages());
  });
});
