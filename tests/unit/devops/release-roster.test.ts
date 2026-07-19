/**
 * The tag-triggered release workflow cannot silently skip — or mis-count — a
 * publishable package.
 *
 * The publish roster (count + package list, in publish order) is owned by
 * `scripts/gen-roster.ts` and generated into `scripts/ci/publish-roster.json`;
 * `.github/workflows/release.yml`'s publish loop reads that JSON with jq rather
 * than carrying a hand-maintained list. Before this single-sourcing, release.yml
 * carried TWO hand-maintained facts — a drift guard `EXPECTED_PUBLISHABLE=<n>`
 * and the explicit `for pkg in ...; do` loop — and BOTH drifted when `@liteship/stage`
 * was promoted to public: the loop omitted it and the count stayed 22, so a
 * `v0.2.0` tag would have hit the workflow's own guard and aborted before shipping
 * ANY package. release.yml is tag-triggered and never runs in the gauntlet, so
 * nothing caught it.
 *
 * This guard DERIVES the publishable set from the manifests on disk (release.yml's
 * own predicate: `private != true`) and asserts the GENERATED roster matches it —
 * `publish-roster.json` is the roster location the release loop, `liteship` deps,
 * the `package-smoke` command's `PACKAGES` roster (in `@liteship/command`), and
 * `scripts/lib/capsule-detector.ts` all agree on. Pins the LAW (roster == workspace,
 * count == length), not a number, so caret-clean promotions need no churn here but
 * omissions fail loud.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { LITESHIP_PACKAGE_ROSTER } from '@liteship/audit';
import { PUBLISHABLE_ROSTER, collectRosterDrift } from '../../../scripts/gen-roster.js';
import { packageManifests } from '../../support/repo-truths.js';

const REPO = resolve(import.meta.dirname, '..', '..', '..');
const PUBLISH_ROSTER_JSON = resolve(REPO, 'scripts/ci/publish-roster.json');

// The publishable-set truth (packages/*/package.json) is owned by
// tests/support/repo-truths.ts (scar S0.4). release.yml's own predicate is
// `private != true`; this guard's ASSERTIONS are unchanged — only the roster
// moved from a hand-maintained `for pkg in ...` loop to the generated
// scripts/ci/publish-roster.json the loop now reads with jq.

/** The generated publish roster: the packages the release loop ships, in publish order. */
interface PublishRoster {
  readonly $generated: string;
  readonly expectedPublishable: number;
  readonly packages: readonly string[];
}

function publishRoster(): PublishRoster {
  return JSON.parse(readFileSync(PUBLISH_ROSTER_JSON, 'utf8')) as PublishRoster;
}

/** Every packages/* manifest release.yml would publish — its own predicate: not private. */
function derivePublishableNames(): string[] {
  return packageManifests()
    .filter((manifest) => manifest.private !== true && manifest.name != null)
    .map((manifest) => manifest.name as string)
    .sort();
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

describe('release publish roster matches the workspace (scripts/ci/publish-roster.json)', () => {
  it('the generated roster lists exactly the non-private packages on disk', () => {
    // Derived, never hand-counted: a newly-public package missing from the roster fails here.
    expect([...publishRoster().packages].sort()).toEqual(derivePublishableNames());
  });

  it('expectedPublishable equals the non-private package count', () => {
    expect(publishRoster().expectedPublishable).toBe(derivePublishableNames().length);
    expect(publishRoster().expectedPublishable).toBe(publishRoster().packages.length);
  });

  it('@liteship/stage is in the publish roster (the package whose promotion drifted release.yml)', () => {
    expect(publishRoster().packages).toContain('@liteship/stage');
  });

  it('publishes every dependency BEFORE its dependent (topological order)', () => {
    // The tag release ships one package per `liteship ship --filter` invocation, so the ROSTER
    // ORDER — not any in-process sort — decides registry order. A dependent published
    // before its same-version dependency leaves a window where it is installable but
    // unresolvable. Pin the order topological so a roster regeneration that reintroduces a
    // violation (e.g. @liteship/core before @liteship/canonical) fails here instead of on a live tag.
    const order = publishRoster().packages;
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
    expect(violations, `publish order is not topological:\n${violations.join('\n')}`).toEqual([]);
  });

  it('the generated roster membership equals gen-roster PUBLISHABLE_ROSTER (the single roster owner)', () => {
    // scripts/ci/publish-roster.json is a byte-stable projection of gen-roster's
    // PUBLISHABLE_ROSTER (fleet then umbrellas), in publish order — not just membership.
    expect(publishRoster().packages).toEqual([...PUBLISHABLE_ROSTER]);
    expect(publishRoster().expectedPublishable).toBe(PUBLISHABLE_ROSTER.length);
  });

  it('the generated roster equals audit LITESHIP_PACKAGE_ROSTER plus the two umbrellas (the single fleet anchor)', () => {
    // [DUP] Re-anchor: the publish roster's `@liteship/*` membership is owned by `@liteship/audit`'s
    // LITESHIP_PACKAGE_ROSTER; the two non-`@liteship` umbrellas that publish last are added on top
    // (deliberately absent from the scoped fleet).
    expect([...publishRoster().packages].sort()).toEqual([...LITESHIP_PACKAGE_ROSTER, 'create-liteship', 'liteship'].sort());
  });

  it('gen-roster reports no roster drift across the authored roster and shipped copies', () => {
    // The gen-roster staleness gate (`pnpm exec tsx scripts/gen-roster.ts --check`) run
    // in-process: it cross-checks CANONICAL_ROSTER / PUBLISHABLE_ROSTER, the generated
    // publish-roster.json, and release.yml's publish job against the repo-truths-derived
    // set. An empty drift list is the green gate.
    expect(collectRosterDrift()).toEqual([]);
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
