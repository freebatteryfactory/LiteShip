[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [edge/src](../README.md) / EdgeTierResult

# Interface: EdgeTierResult

Defined in: [edge/src/edge-tier.ts:31](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/edge-tier.ts#L31)

Outcome of an edge-side tier detection sweep.

All three fields use the same branded tier types as the client runtime,
so downstream boundary evaluation and output gating reuse the exact
code paths from `@liteship/detect`.

## Properties

### capTier

> `readonly` **capTier**: [`CapTier`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/type-aliases/CapTier.md)

Defined in: [edge/src/edge-tier.ts:33](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/edge-tier.ts#L33)

Highest [CapTier](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/type-aliases/CapTier.md) the device qualifies for.

***

### designTier

> `readonly` **designTier**: `DesignTier`

Defined in: [edge/src/edge-tier.ts:37](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/edge-tier.ts#L37)

Visual fidelity tier permitted for this device.

***

### motionTier

> `readonly` **motionTier**: `MotionTier`

Defined in: [edge/src/edge-tier.ts:35](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/edge-tier.ts#L35)

Motion complexity tier permitted for this device.
