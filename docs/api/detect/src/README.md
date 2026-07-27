[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / detect/src

# detect/src

`@liteship/detect` — **LiteShip** capability probes: device signals mapped to
the `CapTier` lattice and motion/design tiers in `@liteship/core`.

Probes browser APIs for GPU tier, CPU cores, memory, input modality,
motion preferences, color scheme, viewport dimensions, DPR, and
network connection quality. Maps detected capabilities to the
`CapTier` lattice from `@liteship/core`.

## Interfaces

- [CapabilityAxisEvidence](interfaces/CapabilityAxisEvidence.md)
- [CapabilityInputEvidence](interfaces/CapabilityInputEvidence.md)
- [CapabilityTierProjection](interfaces/CapabilityTierProjection.md)
- [DetectionResult](interfaces/DetectionResult.md)
- [DeviceCapabilities](interfaces/DeviceCapabilities.md)
- [ExtendedDetectionResult](interfaces/ExtendedDetectionResult.md)
- [ExtendedDeviceCapabilities](interfaces/ExtendedDeviceCapabilities.md)
- [HeadProbeCaps](interfaces/HeadProbeCaps.md)
- [NavigatorConnectionInfo](interfaces/NavigatorConnectionInfo.md)

## Type Aliases

- [CapabilityAxisValues](type-aliases/CapabilityAxisValues.md)
- [CapabilityEvidenceInput](type-aliases/CapabilityEvidenceInput.md)
- [CapabilityEvidenceInputs](type-aliases/CapabilityEvidenceInputs.md)
- [CapabilityEvidenceSupport](type-aliases/CapabilityEvidenceSupport.md)
- [CapabilityTierEvidence](type-aliases/CapabilityTierEvidence.md)
- [CapAxis](type-aliases/CapAxis.md)
- [DesignTier](type-aliases/DesignTier.md)
- [DetectReadyDetail](type-aliases/DetectReadyDetail.md)
- [Disposer](type-aliases/Disposer.md)
- [GPUTier](type-aliases/GPUTier.md)
- [ObservedCapabilityAxisValues](type-aliases/ObservedCapabilityAxisValues.md)

## Variables

- [CAP\_AXES](variables/CAP_AXES.md)
- [CAPABILITY\_EVIDENCE\_INPUTS](variables/CAPABILITY_EVIDENCE_INPUTS.md)
- [Detect](variables/Detect.md)
- [DETECT\_READY\_EVENT](variables/DETECT_READY_EVENT.md)
- [GPU\_TIER\_DEFAULT](variables/GPU_TIER_DEFAULT.md)
- [GPU\_TIER\_PATTERNS](variables/GPU_TIER_PATTERNS.md)
- [GPU\_TIER\_PRECEDENCE](variables/GPU_TIER_PRECEDENCE.md)

## Functions

- [capAxisAttr](functions/capAxisAttr.md)
- [capSetFromCapabilities](functions/capSetFromCapabilities.md)
- [capTierFromCapabilities](functions/capTierFromCapabilities.md)
- [designTierFromCapabilities](functions/designTierFromCapabilities.md)
- [detect](functions/detect.md)
- [detectGPUTier](functions/detectGPUTier.md)
- [emitDetectUpgradeScript](functions/emitDetectUpgradeScript.md)
- [emitProvisionalDetectScript](functions/emitProvisionalDetectScript.md)
- [headProbeCapTier](functions/headProbeCapTier.md)
- [headProbeMotionTier](functions/headProbeMotionTier.md)
- [motionTierFromCapabilities](functions/motionTierFromCapabilities.md)
- [onDetectReady](functions/onDetectReady.md)
- [projectCapabilityAxisValues](functions/projectCapabilityAxisValues.md)
- [projectCapabilityTierEvidence](functions/projectCapabilityTierEvidence.md)
- [requireObserved](functions/requireObserved.md)
- [resetDetectionCaches](functions/resetDetectionCaches.md)
- [watchCapabilities](functions/watchCapabilities.md)

## References

### MotionTier

Re-exports [MotionTier](../../quantizer/src/type-aliases/MotionTier.md)
