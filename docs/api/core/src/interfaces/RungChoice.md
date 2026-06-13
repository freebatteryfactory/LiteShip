[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / RungChoice

# Interface: RungChoice

Defined in: [core/src/escalation.ts:103](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/escalation.ts#L103)

The successful chooser verdict.

## Properties

### admittedTargets

> `readonly` **admittedTargets**: `ReadonlySet`\<`string`\>

Defined in: [core/src/escalation.ts:107](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/escalation.ts#L107)

The projection targets that rung admits, intersected with the rung's table.

***

### rung

> `readonly` **rung**: [`CapLevel`](../type-aliases/CapLevel.md)

Defined in: [core/src/escalation.ts:105](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/escalation.ts#L105)

The minimal [CapLevel](../type-aliases/CapLevel.md) satisfying site, budget, grants, and admissibility.
