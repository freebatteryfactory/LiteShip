[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [edge/src](../README.md) / TierKey

# Type Alias: TierKey

> **TierKey** = `` `${MotionTier}:${DesignTier}` ``

Defined in: [edge/src/manifest.ts:58](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/manifest.ts#L58)

Key of one cell in the (motion x design) tier grid --
`"<motionTier>:<designTier>"`. The same encoding the KV boundary cache
uses in its keys, so manifest lookups and cache keys can never disagree.
