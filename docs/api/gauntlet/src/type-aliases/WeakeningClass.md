[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / WeakeningClass

# Type Alias: WeakeningClass

> **WeakeningClass** = `"gate-removed"` \| `"gate-level-lowered"` \| `"fixture-reduced"` \| `"waiver-added"` \| `"waiver-extended"` \| `"always-blocking-removed"` \| `"assurance-level-lowered"` \| `"invariant-removed"` \| `"invariant-level-lowered"` \| `"invariant-proof-to-waiver"` \| `"floor-lowered"` \| `"skip-allowlist-added"`

Defined in: [gauntlet/src/standards-facts.ts:330](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/standards-facts.ts#L330)

The WEAKENING CLASS of a weaken (the specific erosion) — used to match an owner
sign-off (a sign-off is class-specific, so authorizing a "lowered floor" does not
also authorize a "removed gate" on the same key by accident).
