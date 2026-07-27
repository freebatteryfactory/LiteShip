[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [detect/src](../README.md) / CapabilityInputEvidence

# Interface: CapabilityInputEvidence

Defined in: [detect/src/cap-axes.ts:72](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/cap-axes.ts#L72)

Provenance for one primitive capability value.

## Properties

### input

> `readonly` **input**: `"gpu"` \| `"cores"` \| `"memory"` \| `"webgpu"` \| `"prefersReducedMotion"` \| `"prefersContrast"` \| `"forcedColors"` \| `"prefersReducedTransparency"` \| `"dynamicRange"` \| `"colorGamut"` \| `"updateRate"`

Defined in: [detect/src/cap-axes.ts:73](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/cap-axes.ts#L73)

***

### source

> `readonly` **source**: `string`

Defined in: [detect/src/cap-axes.ts:76](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/cap-axes.ts#L76)

The concrete probe, hint, heuristic, or fallback that supplied the value.

***

### support

> `readonly` **support**: [`CapabilityEvidenceSupport`](../type-aliases/CapabilityEvidenceSupport.md)

Defined in: [detect/src/cap-axes.ts:74](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/cap-axes.ts#L74)
