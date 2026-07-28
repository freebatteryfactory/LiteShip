/**
 * @liteship/detect type spine -- device capability detection + branded tiers.
 */

import type { CapTier, CapSet, MotionTier } from './core.js';

// ═══════════════════════════════════════════════════════════════════════════════
// § 1. DETECTION TIERS
// ═══════════════════════════════════════════════════════════════════════════════

/** Coarse GPU capability bucket reported by browser detection. */
export type GPUTier = 0 | 1 | 2 | 3;

/** Browser-observed hardware, preference, viewport, and connection capabilities. */
export interface DeviceCapabilities {
  readonly gpu: GPUTier;
  readonly cores: number;
  readonly memory: number;
  readonly webgpu: boolean;
  readonly touchPrimary: boolean;
  readonly prefersReducedMotion: boolean;
  readonly prefersColorScheme: 'light' | 'dark';
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly devicePixelRatio: number;
  readonly connection?: {
    readonly effectiveType: string;
    readonly downlink: number;
    readonly saveData: boolean;
  };
}

/** Canonical capability-axis names shared by detection and hosts. */
export type CapAxis = 'tier' | 'motion' | 'design';

/** Source tier triple projected onto the canonical capability axes. */
export interface CapabilityTierProjection {
  readonly capTier: CapTier;
  readonly motionTier: MotionTier;
  readonly designTier: DesignTier;
}

/** Complete values projected on the three capability axes. */
export interface CapabilityAxisValues {
  readonly tier: CapTier;
  readonly motion: MotionTier;
  readonly design: DesignTier;
}

/** Primitive inputs consumed by the tier ladders. */
export type CapabilityEvidenceInput =
  | 'gpu'
  | 'cores'
  | 'memory'
  | 'webgpu'
  | 'prefersReducedMotion'
  | 'prefersContrast'
  | 'forcedColors'
  | 'prefersReducedTransparency'
  | 'dynamicRange'
  | 'colorGamut'
  | 'updateRate';

/** Provenance for one primitive capability value. */
export interface CapabilityInputEvidence {
  readonly input: CapabilityEvidenceInput;
  readonly support: 'observed' | 'inferred';
  readonly source: string;
}

/** Exhaustive provenance map for the primitive inputs used by the tier ladders. */
export type CapabilityEvidenceInputs = Readonly<{
  [Input in CapabilityEvidenceInput]: CapabilityInputEvidence & { readonly input: Input };
}>;

/** One capability-axis value plus exhaustive primitive provenance. */
export interface CapabilityAxisEvidence<Axis extends CapAxis = CapAxis> {
  readonly axis: Axis;
  readonly value: CapabilityAxisValues[Axis];
  readonly support: 'observed' | 'inferred';
  readonly inputs: readonly CapabilityInputEvidence[];
}

/** Per-axis provenance for one complete tier projection. */
export type CapabilityTierEvidence = Readonly<{
  [Axis in CapAxis]: CapabilityAxisEvidence<Axis>;
}>;

/** Base capability evidence and the rendering tier derived from it. */
export interface DetectionResult {
  readonly capabilities: DeviceCapabilities;
  readonly capTier: CapTier;
  readonly capSet: CapSet;
  readonly tierEvidence: CapabilityTierEvidence;
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 2. DETECTION API
// ═══════════════════════════════════════════════════════════════════════════════

/** A teardown function — call it to remove the listeners it added. */
export type Disposer = () => void;

/** Payload emitted when the head capability probe settles successfully or fails closed. */
export type DetectReadyDetail =
  | {
      readonly tier: CapTier;
      readonly gpuTier: GPUTier;
      readonly webgpu: boolean;
      readonly motionTier: MotionTier;
      readonly error?: undefined;
    }
  | { readonly error: true };

export declare function detect(): ExtendedDetectionResult;

export declare function detectGPUTier(): GPUTier;

export declare function capTierFromCapabilities(caps: DeviceCapabilities): CapTier;

export declare function capSetFromCapabilities(caps: DeviceCapabilities): CapSet;

/** Watch for capability changes (viewport resize, media query changes, etc.) */
export declare function watchCapabilities(onChange: (result: ExtendedDetectionResult) => void): Disposer;

/**
 * Clear memoized session-stable probe results (currently the GPU renderer
 * string). Production code never needs this — it exists for test isolation.
 */
export declare function resetDetectionCaches(): void;

// ═══════════════════════════════════════════════════════════════════════════════
// § 3. 2-AXIS TIERS (design × motion)
// ═══════════════════════════════════════════════════════════════════════════════

/** Ordered visual-detail tier selected from device evidence. */
export type DesignTier = 'minimal' | 'standard' | 'enhanced' | 'rich';

/** Optional browser capabilities used by richer host decisions. */
export interface ExtendedDeviceCapabilities extends DeviceCapabilities {
  readonly prefersContrast: 'no-preference' | 'more' | 'less' | 'custom';
  readonly forcedColors: boolean;
  readonly prefersReducedTransparency: boolean;
  readonly dynamicRange: 'standard' | 'high';
  readonly colorGamut: 'srgb' | 'p3' | 'rec2020';
  readonly updateRate: 'fast' | 'slow' | 'none';
}

/** Detection result extended with motion and design-tier decisions. */
export interface ExtendedDetectionResult extends DetectionResult {
  readonly capabilities: ExtendedDeviceCapabilities;
  readonly designTier: DesignTier;
  readonly motionTier: MotionTier;
}

export declare function designTierFromCapabilities(caps: ExtendedDeviceCapabilities): DesignTier;
export declare function motionTierFromCapabilities(caps: ExtendedDeviceCapabilities): MotionTier;
