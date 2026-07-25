/** Capability-lattice properties for the public detection projections. */

import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import {
  capSetFromCapabilities,
  capTierFromCapabilities,
  designTierFromCapabilities,
  motionTierFromCapabilities,
  type ExtendedDeviceCapabilities,
} from '@liteship/detect';

const CAP_ORDER = ['static', 'styled', 'reactive', 'animated', 'gpu'] as const;

const capabilitiesArb: fc.Arbitrary<ExtendedDeviceCapabilities> = fc.record({
  gpu: fc.constantFrom(0, 1, 2, 3),
  cores: fc.integer({ min: 1, max: 256 }),
  memory: fc.integer({ min: 0, max: 256 }),
  webgpu: fc.boolean(),
  touchPrimary: fc.boolean(),
  prefersReducedMotion: fc.boolean(),
  prefersColorScheme: fc.constantFrom('light' as const, 'dark' as const),
  viewportWidth: fc.integer({ min: 0, max: 16_384 }),
  viewportHeight: fc.integer({ min: 0, max: 16_384 }),
  devicePixelRatio: fc.integer({ min: 1, max: 8 }),
  prefersContrast: fc.constantFrom('no-preference' as const, 'more' as const, 'less' as const, 'custom' as const),
  forcedColors: fc.boolean(),
  prefersReducedTransparency: fc.boolean(),
  dynamicRange: fc.constantFrom('standard' as const, 'high' as const),
  colorGamut: fc.constantFrom('srgb' as const, 'p3' as const, 'rec2020' as const),
  updateRate: fc.constantFrom('fast' as const, 'slow' as const, 'none' as const),
});

describe('@liteship/detect tier laws', () => {
  test('CapSet is exactly the monotone prefix ending at the resolved tier', () => {
    fc.assert(
      fc.property(capabilitiesArb, (caps) => {
        const tier = capTierFromCapabilities(caps);
        const set = capSetFromCapabilities(caps);
        expect(set.levels).toEqual(CAP_ORDER.slice(0, CAP_ORDER.indexOf(tier) + 1));
        expect(set.levels.at(-1)).toBe(tier);
        expect(new Set(set.levels).size).toBe(set.levels.length);
      }),
      { seed: 0x5eed_1811, numRuns: 500 },
    );
  });

  test('accessibility preferences dominate optional fidelity and motion capability', () => {
    fc.assert(
      fc.property(capabilitiesArb, (caps) => {
        expect(motionTierFromCapabilities({ ...caps, prefersReducedMotion: true })).toBe('none');
        expect(designTierFromCapabilities({ ...caps, forcedColors: true })).toBe('minimal');
        expect(designTierFromCapabilities({ ...caps, forcedColors: false, updateRate: 'none' })).toBe('minimal');
      }),
      { seed: 0x5eed_1812, numRuns: 300 },
    );
  });

  test('adding hardware capability cannot lower a fixed-preference cap tier', () => {
    fc.assert(
      fc.property(capabilitiesArb, (caps) => {
        const baseline = capTierFromCapabilities(caps);
        const upgraded = capTierFromCapabilities({ ...caps, gpu: 3, cores: 256, memory: 256, webgpu: true });
        expect(CAP_ORDER.indexOf(upgraded)).toBeGreaterThanOrEqual(CAP_ORDER.indexOf(baseline));
      }),
      { seed: 0x5eed_1813, numRuns: 300 },
    );
  });
});
