/**
 * Branded capability tier mapping -- `DeviceCapabilities` to `CapTier` + `CapSet`.
 *
 * Heuristic mapping:
 *   - low GPU + reduced motion &rarr; `static`
 *   - low GPU &rarr; `styled`
 *   - mid GPU &rarr; `reactive`
 *   - mid GPU + enough cores &rarr; `animated`
 *   - high GPU + WebGPU &rarr; `gpu`
 *
 * @module
 */

import type { CapTier, CapSet, MotionTier } from '@liteship/core';
import type { DeviceCapabilities, ExtendedDeviceCapabilities } from './detect.js';
import { headProbeCapTier, headProbeMotionTier } from './head-probe.js';

const CAP_TIER_ORDER: readonly CapTier[] = ['static', 'styled', 'reactive', 'animated', 'gpu'] as const;

/**
 * Determine the highest capability level the device can support based on
 * its detected hardware and preference characteristics.
 *
 * Advanced — `detect()` already returns this as `result.capTier`; call this
 * directly only when you hold a {@link DeviceCapabilities} that did not come
 * from a `detect()` sweep (capsule/edge consumers).
 */
// GPU tier mapping: 0=no GPU/software, 1=integrated (Intel UHD), 2=mid-range, 3=discrete high-end
//
// Delegates to headProbeCapTier (head-probe.ts) — the SINGLE source of truth
// for this ladder. The Astro head-inline probe emits that same function body
// verbatim, so the runtime sweep and the head probe can never be hand-copies
// that drift. `DeviceCapabilities` is a structural superset of the primitive
// `HeadProbeCaps` the ladder reads, so the value passes through directly.
export function capTierFromCapabilities(caps: DeviceCapabilities): CapTier {
  return headProbeCapTier(caps);
}

/**
 * Build a CapSet containing all levels the device qualifies for.
 * A device at level X automatically has all levels below it.
 *
 * Advanced — `detect()` already returns this as `result.capSet`; call this
 * directly only when you hold a {@link DeviceCapabilities} that did not come
 * from a `detect()` sweep (capsule/edge consumers).
 */
export function capSetFromCapabilities(caps: DeviceCapabilities): CapSet {
  const tier = capTierFromCapabilities(caps);
  const tierIndex = CAP_TIER_ORDER.indexOf(tier);
  const granted = CAP_TIER_ORDER.slice(0, tierIndex + 1);

  // `granted` is a prefix of the ladder order (CAP_TIER_ORDER), so it is already the canonical
  // deduped+sorted level array a CapSet holds — no Set (which JSON drops and mis-addresses).
  return {
    _tag: 'CapSet' as const,
    levels: [...granted],
  };
}

// ---------------------------------------------------------------------------
// 2-Axis Tiers (design × motion)
// ---------------------------------------------------------------------------

/**
 * Visual fidelity tier derived from device capabilities.
 *
 * Drives the breadth of design signals the compositor emits: `minimal` is
 * optimized for forced-colors/low-update displays; `rich` unlocks wide-gamut
 * + HDR treatments. Used orthogonally to {@link MotionTier}.
 */
export type DesignTier = 'minimal' | 'standard' | 'enhanced' | 'rich';
export type { MotionTier } from '@liteship/core';

/**
 * Map extended device capabilities to a design fidelity tier.
 * Forced colors / no-update screens get minimal; wide-gamut / HDR screens
 * get rich; standard otherwise with an enhanced middle ground.
 *
 * Advanced — `detect()` already returns this as `result.designTier`; call
 * this directly only when you hold an {@link ExtendedDeviceCapabilities}
 * that did not come from a `detect()` sweep (capsule/edge consumers).
 */
export function designTierFromCapabilities(caps: ExtendedDeviceCapabilities): DesignTier {
  if (caps.forcedColors || caps.updateRate === 'none') return 'minimal';
  if (caps.updateRate === 'slow') return 'standard';
  if (caps.colorGamut !== 'srgb' || caps.dynamicRange === 'high') return 'rich';
  if (!caps.prefersReducedTransparency && caps.prefersContrast === 'no-preference') return 'enhanced';
  return 'standard';
}

/**
 * Map extended device capabilities to a motion complexity tier.
 * Reduced-motion &rarr; `none`; GPU tier and core count gate the upper levels;
 * WebGPU availability unlocks the `compute` tier.
 *
 * Advanced — `detect()` already returns this as `result.motionTier`; call
 * this directly only when you hold an {@link ExtendedDeviceCapabilities}
 * that did not come from a `detect()` sweep (capsule/edge consumers).
 */
//
// Delegates to headProbeMotionTier (head-probe.ts) — the SINGLE source of truth
// for the motion ladder, emitted verbatim into the Astro head probe. One body,
// two consumers; they cannot drift.
export function motionTierFromCapabilities(caps: ExtendedDeviceCapabilities): MotionTier {
  return headProbeMotionTier(caps);
}
