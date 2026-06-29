[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / RungChoice

# Interface: RungChoice

Defined in: [core/src/escalation.ts:118](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/escalation.ts#L118)

The successful chooser verdict.

## Properties

### admittedTargets

> `readonly` **admittedTargets**: `ReadonlySet`\<`string`\>

Defined in: [core/src/escalation.ts:122](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/escalation.ts#L122)

The projection targets that rung admits, intersected with the rung's table.

***

### rung

> `readonly` **rung**: [`CapTier`](../type-aliases/CapTier.md)

Defined in: [core/src/escalation.ts:120](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/escalation.ts#L120)

The minimal [CapTier](../type-aliases/CapTier.md) satisfying site, budget, grants, and admissibility.
