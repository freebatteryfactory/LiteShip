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
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { PACKAGES } from '@czap/command';

const REPO = resolve(import.meta.dirname, '..', '..', '..');
const PACKAGES_DIR = resolve(REPO, 'packages');

/** The authoritative publishable set: every packages/* manifest with public access and not private. */
function derivePublishableScopes(): string[] {
  const names: string[] = [];
  for (const entry of readdirSync(PACKAGES_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifestPath = join(PACKAGES_DIR, entry.name, 'package.json');
    let manifest: { name?: string; private?: boolean; publishConfig?: { access?: string } };
    try {
      manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    } catch {
      continue; // no manifest → not a package
    }
    const publishable = manifest.publishConfig?.access === 'public' && manifest.private !== true;
    if (publishable && manifest.name) names.push(manifest.name);
  }
  return names.sort();
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
    for (const entry of readdirSync(PACKAGES_DIR, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      let manifest: { name?: string; private?: boolean; publishConfig?: { access?: string } };
      try {
        manifest = JSON.parse(readFileSync(join(PACKAGES_DIR, entry.name, 'package.json'), 'utf8'));
      } catch {
        continue;
      }
      if (manifest.private === true || manifest.publishConfig?.access !== 'public') {
        expect(derivePublishableScopes()).not.toContain(manifest.name);
      }
    }
  });
});
