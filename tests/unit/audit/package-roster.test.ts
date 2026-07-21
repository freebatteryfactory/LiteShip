/**
 * Owner pin — `@liteship/audit`'s `LITESHIP_PACKAGE_ROSTER` is the SINGLE fleet roster
 * anchor (scar S0.4; master-plan `[DUP]` `src/consumer.ts`).
 *
 * The copies that will re-anchor to it (liteship's `LITESHIP_PACKAGES`, command's
 * package-smoke `PACKAGES`, the cli package-metadata catalog, release.yml, and the
 * repo-truths `packageRoster()` delegation) rely on two properties: the exact
 * dependency (install) ORDER, and membership equal to the on-disk publishable
 * `@liteship/*` set. This pins both — the exact ordered list, that it carries no
 * umbrellas / duplicates / non-`@liteship` entries, that its membership equals the
 * disk-derived fleet (`packageRoster()`), and that its order equals the authored
 * dependency order owned by `scripts/gen-roster.ts` (`CANONICAL_ROSTER`).
 *
 * @module
 */
// PROVES: INV-ROSTER-SINGLE-SOURCE
import { describe, it, expect } from 'vitest';
import { LITESHIP_PACKAGE_ROSTER } from '@liteship/audit';
import { CANONICAL_ROSTER } from '../../../scripts/gen-roster.js';
import { packageRoster } from '../../support/repo-truths.js';

/** The canonical dependency (install) order the copies mirror, pinned literally. */
const EXPECTED_DEPENDENCY_ORDER: readonly string[] = [
  '@liteship/_spine',
  '@liteship/error',
  '@liteship/canonical',
  '@liteship/core',
  '@liteship/genui',
  '@liteship/quantizer',
  '@liteship/compiler',
  '@liteship/web',
  '@liteship/detect',
  '@liteship/edge',
  '@liteship/vite',
  '@liteship/worker',
  '@liteship/remotion',
  '@liteship/scene',
  '@liteship/astro',
  '@liteship/cloudflare',
  '@liteship/stage',
  '@liteship/assets',
  '@liteship/gauntlet',
  '@liteship/audit',
  '@liteship/command',
  '@liteship/cli',
  '@liteship/mcp-server',
];

describe('LITESHIP_PACKAGE_ROSTER — the single fleet roster anchor', () => {
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
    expect([...LITESHIP_PACKAGE_ROSTER]).toEqual([...EXPECTED_DEPENDENCY_ORDER]);
  });

  it('matches the on-disk publishable @liteship/* set (membership == repo-truths fleet)', () => {
    // The law the drift-guards enforce: the anchor covers EXACTLY the non-private
    // `@liteship/*` packages on disk — no more, no fewer — so a newly-public package
    // that is missed fails loud rather than shipping an incomplete fleet.
    expect([...LITESHIP_PACKAGE_ROSTER].sort()).toEqual([...packageRoster()].sort());
  });

  it('equals gen-roster CANONICAL_ROSTER in dependency order (authored order agrees)', () => {
    // gen-roster.ts is the authored owner of the dependency order; the anchor and
    // the generator must agree byte-for-byte in order so Phase-2 re-anchoring is a
    // no-op relabel, not a reordering.
    expect([...LITESHIP_PACKAGE_ROSTER]).toEqual([...CANONICAL_ROSTER]);
  });
});
