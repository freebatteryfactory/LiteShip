[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / TierChoice

# Interface: TierChoice

Defined in: [core/src/evidence/escalation.ts:118](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/evidence/escalation.ts#L118)

The successful chooser verdict.

## Properties

### admittedTargets

> `readonly` **admittedTargets**: `ReadonlySet`\<`string`\>

Defined in: [core/src/evidence/escalation.ts:122](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/evidence/escalation.ts#L122)

The projection targets that tier admits, intersected with the tier's table.

***

### tier

> `readonly` **tier**: [`CapTier`](../type-aliases/CapTier.md)

Defined in: [core/src/evidence/escalation.ts:120](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/evidence/escalation.ts#L120)

The minimal [CapTier](../type-aliases/CapTier.md) satisfying site, budget, grants, and admissibility.
