[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / detect/src

# detect/src

`@czap/detect` — **LiteShip** capability probes: device signals mapped to
the `CapLevel` lattice and motion/design tiers in `@czap/core`.

Probes browser APIs for GPU tier, CPU cores, memory, input modality,
motion preferences, color scheme, viewport dimensions, DPR, and
network connection quality. Maps detected capabilities to the
`CapLevel` lattice from `@czap/core`.

## Interfaces

- [DetectionResult](interfaces/DetectionResult.md)
- [DeviceCapabilities](interfaces/DeviceCapabilities.md)
- [ExtendedDetectionResult](interfaces/ExtendedDetectionResult.md)
- [ExtendedDeviceCapabilities](interfaces/ExtendedDeviceCapabilities.md)
- [NavigatorConnectionInfo](interfaces/NavigatorConnectionInfo.md)

## Type Aliases

- [CapAxis](type-aliases/CapAxis.md)
- [DesignTier](type-aliases/DesignTier.md)
- [GPUTier](type-aliases/GPUTier.md)

## Variables

- [CAP\_AXES](variables/CAP_AXES.md)
- [Detect](variables/Detect.md)

## Functions

- [capAxisAttr](functions/capAxisAttr.md)
- [capSetFromCapabilities](functions/capSetFromCapabilities.md)
- [designTierFromCapabilities](functions/designTierFromCapabilities.md)
- [detect](functions/detect.md)
- [detectGPUTier](functions/detectGPUTier.md)
- [motionTierFromCapabilities](functions/motionTierFromCapabilities.md)
- [resetDetectionCaches](functions/resetDetectionCaches.md)
- [tierFromCapabilities](functions/tierFromCapabilities.md)
- [watchCapabilities](functions/watchCapabilities.md)

## References

### MotionTier

Re-exports [MotionTier](../../quantizer/src/type-aliases/MotionTier.md)
