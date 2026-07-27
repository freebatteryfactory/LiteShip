[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [edge/src](../README.md) / EdgeTierResult

# Interface: EdgeTierResult

Defined in: [edge/src/edge-tier.ts:32](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/edge-tier.ts#L32)

Outcome of an edge-side tier detection sweep.

All three fields use the same branded tier types as the client runtime,
so downstream boundary evaluation and output gating reuse the exact
code paths from `@liteship/detect`.

## Properties

### capTier

> `readonly` **capTier**: [`CapTier`](../../../liteship/src/evidence/type-aliases/CapTier.md)

Defined in: [edge/src/edge-tier.ts:34](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/edge-tier.ts#L34)

Highest [CapTier](../../../liteship/src/evidence/type-aliases/CapTier.md) the device qualifies for.

***

### designTier

> `readonly` **designTier**: `DesignTier`

Defined in: [edge/src/edge-tier.ts:38](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/edge-tier.ts#L38)

Visual fidelity tier permitted for this device.

***

### motionTier

> `readonly` **motionTier**: [`MotionTier`](../../../spine/type-aliases/MotionTier.md)

Defined in: [edge/src/edge-tier.ts:36](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/edge-tier.ts#L36)

Motion complexity tier permitted for this device.
