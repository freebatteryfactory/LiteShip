/**
 * The tag-triggered release workflow cannot silently skip — or mis-count — a
 * publishable package.
 *
 * `.github/workflows/release.yml` carries TWO hand-maintained facts: a drift guard
 * `EXPECTED_PUBLISHABLE=<n>`, and the explicit `for pkg in ...; do` publish loop (kept
 * explicit so publish ORDER is reviewable in PR). Both drifted when `@czap/stage` was
 * promoted to public — the loop omitted it and the count stayed 22 — so a `v0.2.0` tag
 * would have hit the workflow's own guard and aborted before shipping ANY package.
 * release.yml is tag-triggered and never runs in the gauntlet, so nothing caught it.
 *
 * This guard DERIVES the publishable set from the manifests on disk (release.yml's own
 * predicate: `private != true`) and asserts BOTH facts match it — release.yml is the
 * 4th roster location alongside `liteship` deps, `scripts/package-smoke.ts`, and
 * `scripts/lib/capsule-detector.ts`. Pins the LAW (loop == workspace, count == length),
 * not a number, so caret-clean promotions need no churn here but omissions fail loud.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const REPO = resolve(import.meta.dirname, '..', '..', '..');
const PACKAGES_DIR = resolve(REPO, 'packages');
const RELEASE_YML = resolve(REPO, '.github/workflows/release.yml');

/** Every packages/* manifest release.yml would publish — its own predicate: not private. */
function derivePublishableNames(): string[] {
  const names: string[] = [];
  for (const entry of readdirSync(PACKAGES_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    let manifest: { name?: string; private?: boolean };
    try {
      manifest = JSON.parse(readFileSync(join(PACKAGES_DIR, entry.name, 'package.json'), 'utf8'));
    } catch {
      continue; // no manifest → not a package
    }
    if (manifest.private !== true && manifest.name) names.push(manifest.name);
  }
  return names.sort();
}

/** The explicit publish-loop list in release.yml, read from source. */
function releaseLoopNames(): string[] {
  const match = readFileSync(RELEASE_YML, 'utf8').match(/for pkg in ([^;]+); do/);
  if (!match) throw new Error('release.yml: could not find the `for pkg in ...; do` publish loop');
  return match[1]!.trim().split(/\s+/).sort();
}

/** The hand-maintained EXPECTED_PUBLISHABLE drift-guard count in release.yml. */
function releaseExpectedCount(): number {
  const match = readFileSync(RELEASE_YML, 'utf8').match(/EXPECTED_PUBLISHABLE=(\d+)/);
  if (!match) throw new Error('release.yml: could not find EXPECTED_PUBLISHABLE=<n>');
  return Number(match[1]);
}

describe('release.yml publish roster matches the workspace (the 4th roster location)', () => {
  it('the publish loop lists exactly the non-private packages on disk', () => {
    // Derived, never hand-counted: a newly-public package missing from the loop fails here.
    expect(releaseLoopNames()).toEqual(derivePublishableNames());
  });

  it('EXPECTED_PUBLISHABLE equals the non-private package count', () => {
    expect(releaseExpectedCount()).toBe(derivePublishableNames().length);
  });

  it('@czap/stage is in the publish loop (the package whose promotion drifted release.yml)', () => {
    expect(releaseLoopNames()).toContain('@czap/stage');
  });

  it('the trusted-publisher checklist (RELEASING.md) states the right publishable count', () => {
    // The maintainer configures OIDC trusted publishing per package from this count
    // before tagging; a stale number leaves a newly-public package without a publisher
    // and the tag release fails. Pin the checklist count to the derived truth.
    const count = derivePublishableNames().length;
    const releasing = readFileSync(resolve(REPO, 'docs/RELEASING.md'), 'utf8');
    expect(releasing).toContain(`${count} publishable packages`);
  });
});
