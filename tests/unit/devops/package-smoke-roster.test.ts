/**
 * CUT B6a — the release gate cannot silently skip a publishable package.
 *
 * The `package-smoke` command (migrated out of `scripts/package-smoke.ts`, CUT A5)
 * pack/install/import-smokes every publishable `@czap/*` scope before release. Its
 * `PACKAGES` roster is hand-maintained, so a newly-published package can land
 * WITHOUT being added — the gate then passes while never proving the new package
 * installs or imports. (That is exactly how `@czap/command` slipped the net.) This
 * guard DERIVES the publishable set from the package manifests on disk and asserts
 * the smoke roster covers exactly that set — so the gate can't lie again.
 *
 * The roster is now pure data exported from `@czap/command` (the
 * `package-smoke-registry` module), so it is imported directly rather than read
 * from a self-executing script source.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { PACKAGES } from '@czap/command';
import { packageManifests } from '../../support/repo-truths.js';

// The publishable-set truth (packages/*/package.json publishConfig) is owned by
// tests/support/repo-truths.ts (scar S0.4). This guard's ASSERTIONS are unchanged
// — only the manifest reading moved to the single owner.

/** The authoritative publishable set: every packages/* manifest with public access and not private. */
function derivePublishableScopes(): string[] {
  return packageManifests()
    .filter((manifest) => manifest.publishConfig?.access === 'public' && manifest.private !== true && manifest.name != null)
    .map((manifest) => manifest.name as string)
    .sort();
}

/** The names listed in the package-smoke PACKAGES roster (the data exported from @czap/command). */
function smokeRosterScopes(): string[] {
  return PACKAGES.map((pkg) => pkg.name).sort();
}

describe('B6a — package-smoke covers exactly the publishable @czap/* roster', () => {
  it('the smoke roster equals the publishable set derived from packages/*/package.json', () => {
    // Derived, never hand-counted: a new publishable package not added to the smoke fails here.
    expect(smokeRosterScopes()).toEqual(derivePublishableScopes());
  });

  it('@czap/command is in the smoke roster (the package that slipped the net)', () => {
    expect(smokeRosterScopes()).toContain('@czap/command');
  });

  it('private / non-public packages are excluded from the derived publishable set', () => {
    // Guards the filter itself: if a manifest were marked private it must not be required
    // in the smoke roster. (Today none are private; this pins the rule, not the count.)
    for (const manifest of packageManifests()) {
      if (manifest.private === true || manifest.publishConfig?.access !== 'public') {
        expect(derivePublishableScopes()).not.toContain(manifest.name);
      }
    }
  });
});
