// @vitest-environment node
// GENERATED — do not edit by hand
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { remotionAdapterCapsule } from '../../../packages/remotion/src/capsules/remotion-adapter.js';

// DECLARED-INTEGRATION host-capability matrix for 'remotion.video-frame-output'. NO MOCKS ON THE HOST
// PATH: each declared site is proved by a REAL-host lane that already exists (the
// coverage links below) or recorded as an honest GAP (no real-host lane). This is
// a waiver WITH TEETH — the suite-exists + references-adapter assertions fail RED
// if a linked proof is deleted, renamed, or stops touching the adapter.

/** Real-host suites that prove a declared-site set (asserted to exist + reference the adapter). */
const coverage: ReadonlyArray<{
  readonly sites: readonly string[];
  readonly coverageRef: string;
  readonly lane: string;
  readonly referencesNeedle: string;
}> = [
    {
      "sites": [
        "node"
      ],
      "coverageRef": "tests/unit/remotion/remotion.test.ts",
      "lane": "pnpm run test:unit",
      "referencesNeedle": "precomputeFrames"
    }
  ];

/** Declared sites with NO real-host lane — tracked gaps, never a fabricated link. */
const gaps: ReadonlyArray<{ readonly site: string; readonly reason: string }> = [
    {
      "site": "browser",
      "reason": "no real-browser render lane exercises the adapter Provider + useCzapState hook — only jsdom (tests/unit/remotion/remotion.test.ts) covers the React-host surface, and jsdom is a simulated host. A real-browser lane (vitest browser-mode under tests/browser/ or a Playwright e2e rendering the Remotion <Provider>) is missing."
    }
  ];

describe('remotion.video-frame-output (integration: host capability matrix — declared-integration)', () => {
  const cap = remotionAdapterCapsule as { site?: readonly string[] };
  const declaredSites = [...(cap.site ?? [])].sort();

  it('the adapter declares a non-empty host-site set (the matrix domain)', () => {
    expect(Array.isArray(cap.site)).toBe(true);
    expect(declaredSites.length).toBeGreaterThan(0);
  });

  it('covered + gap sites partition exactly the declared site set (no site silently uncovered)', () => {
    // Source of truth is the adapter's declared `site` array. Every declared
    // site must be either covered by a named real-host suite OR a tracked gap —
    // a site in neither set would be an untracked hole, exactly what this guards.
    const accounted = [
      ...coverage.flatMap((c) => c.sites),
      ...gaps.map((g) => g.site),
    ].sort();
    expect(accounted).toEqual(declaredSites);
  });

  it('every coverage link points at a real-host suite that EXISTS and references the adapter', () => {
    // TEETH: a link can't rot into a lie. If the referenced suite file is gone,
    // or no longer mentions the adapter, this fails RED — the proof is gone.
    expect(coverage.length + gaps.length).toBeGreaterThan(0);
    for (const link of coverage) {
      const abs = resolve(process.cwd(), link.coverageRef);
      expect(existsSync(abs), `real-host suite missing: ${link.coverageRef} (lane: ${link.lane})`).toBe(true);
      const body = readFileSync(abs, 'utf8');
      expect(
        body.includes(link.referencesNeedle),
        `suite ${link.coverageRef} no longer references the adapter (expected substring '${link.referencesNeedle}')`,
      ).toBe(true);
      // Each covered site must be one the adapter actually declares.
      for (const site of link.sites) {
        expect(declaredSites, `coverage claims undeclared site '${site}'`).toContain(site);
      }
    }
  });

  it.each(gaps.length > 0 ? gaps : [{ site: '<none>', reason: 'no gaps' }])(
    'tracked host-coverage GAP: $site has no real-host lane ($reason)',
    ({ site }) => {
      // An honest, RED-visible record (a real running it(), never a skipped
      // placeholder): a declared site with no real-host lane. The owner sees it
      // in the test report and the manifest.
      // When the site IS a real gap, assert it is genuinely declared (so the gap
      // entry can't drift stale); the sentinel row is a no-op when there are none.
      if (site === '<none>') return;
      expect(declaredSites, `gap names site '${site}' the adapter no longer declares`).toContain(site);
    },
  );
});
