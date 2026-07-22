/**
 * Projection pin — `@liteship/audit`'s `LITESHIP_PACKAGE_ROSTER` is generated
 * from the one typed owner in `scripts/package-catalog.ts`.
 *
 * The copies that will re-anchor to it (liteship's `LITESHIP_PACKAGES`, command's
 * package-smoke `PACKAGES`, the cli package-metadata catalog, release.yml, and the
 * repo-truths `packageRoster()` delegation) rely on two properties: the exact
 * dependency (install) ORDER, and membership equal to the on-disk publishable
 * `@liteship/*` set. This pins both — the exact ordered list, that it carries no
 * umbrellas / duplicates / non-`@liteship` entries, that its membership equals the
 * disk-derived fleet (`packageRoster()`), and that its order equals the one
 * authored package catalog projected by `scripts/gen-roster.ts`.
 *
 * @module
 */
// PROVES: INV-ROSTER-SINGLE-SOURCE
import { describe, it, expect } from 'vitest';
import { LITESHIP_PACKAGE_ROSTER } from '@liteship/audit';
import { CANONICAL_ROSTER } from '../../../scripts/gen-roster.js';
import { packageRoster } from '../../support/repo-truths.js';

describe('LITESHIP_PACKAGE_ROSTER — generated scoped-fleet projection', () => {
  it('is non-empty', () => {
    expect(LITESHIP_PACKAGE_ROSTER.length).toBeGreaterThan(0);
  });

  it('carries no duplicate entries', () => {
    expect(new Set(LITESHIP_PACKAGE_ROSTER).size).toBe(LITESHIP_PACKAGE_ROSTER.length);
  });

  it('is the scoped fleet only — every entry is a `@liteship/*` scope, no umbrellas', () => {
    for (const name of LITESHIP_PACKAGE_ROSTER) expect(name.startsWith('@liteship/')).toBe(true);
    expect(LITESHIP_PACKAGE_ROSTER).not.toContain('liteship');
    expect(LITESHIP_PACKAGE_ROSTER).not.toContain('create-liteship');
  });

  it('is in the exact canonical dependency (install) order the copies mirror', () => {
    expect([...LITESHIP_PACKAGE_ROSTER]).toEqual([...CANONICAL_ROSTER]);
  });

  it('matches the on-disk publishable @liteship/* set (membership == repo-truths fleet)', () => {
    // The law the drift-guards enforce: the anchor covers EXACTLY the non-private
    // `@liteship/*` packages on disk — no more, no fewer — so a newly-public package
    // that is missed fails loud rather than shipping an incomplete fleet.
    expect([...LITESHIP_PACKAGE_ROSTER].sort()).toEqual([...packageRoster()].sort());
  });

  it('equals the generated canonical roster in dependency order', () => {
    // Both values are projections of scripts/package-catalog.ts; manifests are
    // checked separately as the independent physical oracle.
    expect([...LITESHIP_PACKAGE_ROSTER]).toEqual([...CANONICAL_ROSTER]);
  });
});
