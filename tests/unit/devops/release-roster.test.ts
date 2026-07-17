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
 * 4th roster location alongside `liteship` deps, the `package-smoke` command's
 * `PACKAGES` roster (in `@czap/command`), and `scripts/lib/capsule-detector.ts`.
 * Pins the LAW (loop == workspace, count == length),
 * not a number, so caret-clean promotions need no churn here but omissions fail loud.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { packageManifests } from '../../support/repo-truths.js';

const REPO = resolve(import.meta.dirname, '..', '..', '..');
const RELEASE_YML = resolve(REPO, '.github/workflows/release.yml');

// The publishable-set truth (packages/*/package.json) is owned by
// tests/support/repo-truths.ts (scar S0.4). release.yml's own predicate is
// `private != true`; this guard's ASSERTIONS are unchanged — only the manifest
// reading moved to the single owner. The release.yml parsing below stays local:
// the workflow file is release.yml's own truth, not a shared repo fact.

/** Every packages/* manifest release.yml would publish — its own predicate: not private. */
function derivePublishableNames(): string[] {
  return packageManifests()
    .filter((manifest) => manifest.private !== true && manifest.name != null)
    .map((manifest) => manifest.name as string)
    .sort();
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

/** The publish-loop list in the ORDER it publishes (unsorted) — for the topo-order check. */
function releaseLoopOrder(): string[] {
  const match = readFileSync(RELEASE_YML, 'utf8').match(/for pkg in ([^;]+); do/);
  if (!match) throw new Error('release.yml: could not find the `for pkg in ...; do` publish loop');
  return match[1]!.trim().split(/\s+/);
}

/** Each publishable package → its in-workspace (publishable) dependency names. */
function publishableDeps(): Map<string, readonly string[]> {
  const publishable = new Set(derivePublishableNames());
  const map = new Map<string, readonly string[]>();
  for (const manifest of packageManifests()) {
    if (manifest.private !== true && manifest.name != null) {
      map.set(
        manifest.name,
        Object.keys(manifest.dependencies ?? {}).filter((dep) => publishable.has(dep)),
      );
    }
  }
  return map;
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

  it('publishes every dependency BEFORE its dependent (topological order)', () => {
    // The tag release ships one package per `czap ship --filter` invocation, so the LOOP
    // ORDER — not any in-process sort — decides registry order. A dependent published
    // before its same-version dependency leaves a window where it is installable but
    // unresolvable. Pin the order topological so a hand-edit that reintroduces a violation
    // (e.g. @czap/core before @czap/canonical) fails here instead of on a live tag.
    const order = releaseLoopOrder();
    const pos = new Map(order.map((name, i) => [name, i] as const));
    const deps = publishableDeps();
    const violations: string[] = [];
    for (const name of order) {
      for (const dep of deps.get(name) ?? []) {
        if ((pos.get(dep) ?? -1) > (pos.get(name) ?? -1)) {
          violations.push(`${name} (pos ${pos.get(name)}) publishes before its dependency ${dep} (pos ${pos.get(dep)})`);
        }
      }
    }
    expect(violations, `release.yml publish order is not topological:\n${violations.join('\n')}`).toEqual([]);
  });

  it('the trusted-publisher checklist (RELEASING.md) states the right publishable count', () => {
    // The maintainer configures OIDC trusted publishing per package from this count
    // before tagging; a stale number leaves a newly-public package without a publisher
    // and the tag release fails. Pin the checklist count to the derived truth.
    const count = derivePublishableNames().length;
    const releasing = readFileSync(resolve(REPO, 'RELEASING.md'), 'utf8');
    expect(releasing).toContain(`${count} publishable packages`);
  });
});
