[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / RungChoice

# Interface: RungChoice

Defined in: [core/src/escalation.ts:114](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/escalation.ts#L114)

The successful chooser verdict.

## Properties

### admittedTargets

> `readonly` **admittedTargets**: `ReadonlySet`\<`string`\>

Defined in: [core/src/escalation.ts:118](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/escalation.ts#L118)

The projection targets that rung admits, intersected with the rung's table.

***

### rung

> `readonly` **rung**: [`CapLevel`](../type-aliases/CapLevel.md)

Defined in: [core/src/escalation.ts:116](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/escalation.ts#L116)

The minimal [CapLevel](../type-aliases/CapLevel.md) satisfying site, budget, grants, and admissibility.
