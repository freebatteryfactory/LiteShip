[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [edge/src](../README.md) / EdgeTierResult

# Interface: EdgeTierResult

Defined in: [edge/src/edge-tier.ts:39](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/edge-tier.ts#L39)

Outcome of an edge-side tier detection sweep.

All three fields use the same branded tier types as the client runtime,
so downstream boundary evaluation and output gating reuse the exact
code paths from `@liteship/detect`.

## Properties

### capTier

> `readonly` **capTier**: [`CapTier`](../../../liteship/src/evidence/type-aliases/CapTier.md)

Defined in: [edge/src/edge-tier.ts:41](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/edge-tier.ts#L41)

Highest [CapTier](../../../liteship/src/evidence/type-aliases/CapTier.md) the device qualifies for.

***

### designTier

> `readonly` **designTier**: `DesignTier`

Defined in: [edge/src/edge-tier.ts:45](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/edge-tier.ts#L45)

Visual fidelity tier permitted for this device.

***

### motionTier

> `readonly` **motionTier**: [`MotionTier`](../../../spine/type-aliases/MotionTier.md)

Defined in: [edge/src/edge-tier.ts:43](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/edge-tier.ts#L43)

Motion complexity tier permitted for this device.

***

### tierEvidence

> `readonly` **tierEvidence**: `CapabilityTierEvidence`

Defined in: [edge/src/edge-tier.ts:47](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/edge-tier.ts#L47)

Per-axis observed/inferred provenance for the complete tier values.
