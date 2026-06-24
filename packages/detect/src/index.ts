/**
 * `@czap/detect` — **LiteShip** capability probes: device signals mapped to
 * the `CapTier` lattice and motion/design tiers in `@czap/core`.
 *
 * Probes browser APIs for GPU tier, CPU cores, memory, input modality,
 * motion preferences, color scheme, viewport dimensions, DPR, and
 * network connection quality. Maps detected capabilities to the
 * `CapTier` lattice from `@czap/core`.
 *
 * @module
 */

export type {
  GPUTier,
  DeviceCapabilities,
  DetectionResult,
  ExtendedDeviceCapabilities,
  ExtendedDetectionResult,
  NavigatorConnectionInfo,
} from './detect.js';
export { detect, detectGPUTier, watchCapabilities, resetDetectionCaches, Detect } from './detect.js';
export type { DesignTier, MotionTier } from './tiers.js';
export {
  capTierFromCapabilities,
  capSetFromCapabilities,
  designTierFromCapabilities,
  motionTierFromCapabilities,
} from './tiers.js';
export { CAP_AXES, capAxisAttr } from './cap-axes.js';
export type { CapAxis } from './cap-axes.js';
export { GPU_TIER_PATTERNS, GPU_TIER_PRECEDENCE, GPU_TIER_DEFAULT } from './gpu-patterns.js';
export {
  emitDetectUpgradeScript,
  emitProvisionalDetectScript,
  headProbeCapTier,
  headProbeMotionTier,
} from './head-probe.js';
export type { HeadProbeCaps } from './head-probe.js';
export { DETECT_READY_EVENT, onDetectReady } from './detect-ready.js';
export type { DetectReadyDetail, Disposer } from './detect-ready.js';
