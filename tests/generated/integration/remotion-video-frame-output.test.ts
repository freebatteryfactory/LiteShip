// @vitest-environment jsdom
// GENERATED — do not edit by hand
import { describe, it, expect } from 'vitest';
import { remotionAdapterCapsule } from '../../../packages/remotion/src/capsules/remotion-adapter.js';
import { siteProbes } from '../../support/site-adapter-integration/remotion-video-frame-output.js';

describe('remotion.video-frame-output (integration: host capability matrix)', () => {
  const cap = remotionAdapterCapsule as { site?: readonly string[] };
  const declaredSites = [...(cap.site ?? [])].sort();
  const probedSites = Object.keys(siteProbes).sort();

  it('the host-capability driver covers exactly the declared site set', () => {
    // The matrix domain is the capsule's declared `site` array (source of
    // truth). The driver must cover every declared site and no extras — a
    // drift here means a site shipped without a real host probe, or a probe
    // claims a site the adapter never declared.
    expect(probedSites).toEqual(declaredSites);
  });

  it('each declared site supports the adapter under the real host', async () => {
    // Drive every declared site through its REAL host probe (production
    // middleware / renderer / hook — no mock on the host-capability path).
    // Each probe returns a structural result proving the host path actually ran.
    expect(declaredSites.length).toBeGreaterThan(0);
    for (const site of declaredSites) {
      const probe = siteProbes[site];
      expect(probe, `no host probe wired for declared site '${site}'`).toBeTypeOf('function');
      const result = await probe!();
      // The probe ran under the real host and reported the site it drove.
      expect(result.site).toBe(site);
    }
  });
});
