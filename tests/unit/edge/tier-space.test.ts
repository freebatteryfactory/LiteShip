/**
 * Tier-space drift guard.
 *
 * The boundary manifest precompiles outputs for every (motion x design)
 * tier; the runtime tier detectors in @liteship/detect must never be able to
 * produce a tier the manifest grid does not cover. These tests pin the
 * enumeration in @liteship/edge to the detector vocabularies (the type-level
 * `satisfies` + exhaustiveness checks live in packages/edge/src/manifest.ts).
 */

import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { ClientHints, DESIGN_TIERS, MOTION_TIERS, enumerateTierKeys, tierKey } from '@liteship/edge';
import { designTierFromCapabilities, motionTierFromCapabilities } from '@liteship/detect';

describe('tier space enumeration', () => {
  test('tier grid is the full motion x design cross product, keyed like the KV cache', () => {
    const keys = enumerateTierKeys();

    expect(keys).toHaveLength(MOTION_TIERS.length * DESIGN_TIERS.length);
    expect(new Set(keys).size).toBe(keys.length);
    for (const motionTier of MOTION_TIERS) {
      for (const designTier of DESIGN_TIERS) {
        expect(keys).toContain(tierKey({ motionTier, designTier }));
        expect(tierKey({ motionTier, designTier })).toBe(`${motionTier}:${designTier}`);
      }
    }
  });

  test('every tier the detectors can produce is inside the enumerated grid', () => {
    fc.assert(
      fc.property(
        fc.record({
          'sec-ch-viewport-width': fc.integer({ min: 0, max: 4000 }).map(String),
          'sec-ch-device-memory': fc.constantFrom('0.5', '2', '4', '8', '16'),
          'sec-ch-prefers-reduced-motion': fc.constantFrom('no-preference', 'reduce'),
          'sec-ch-prefers-color-scheme': fc.constantFrom('light', 'dark'),
          'sec-ch-ua-mobile': fc.constantFrom('?0', '?1'),
          'save-data': fc.constantFrom('on', 'off'),
        }),
        (headers) => {
          const caps = ClientHints.parseClientHints(headers);
          const motionTier = motionTierFromCapabilities(caps);
          const designTier = designTierFromCapabilities(caps);
          return (
            (MOTION_TIERS as readonly string[]).includes(motionTier) &&
            (DESIGN_TIERS as readonly string[]).includes(designTier) &&
            enumerateTierKeys().includes(tierKey({ motionTier, designTier }))
          );
        },
      ),
    );
  });
});
