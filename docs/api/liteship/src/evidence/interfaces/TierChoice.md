[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/evidence](../README.md) / TierChoice

# Interface: TierChoice

Defined in: core/dist/evidence/escalation.d.ts:39

The successful chooser verdict.

## Properties

### admittedTargets

> `readonly` **admittedTargets**: `ReadonlySet`\<`string`\>

Defined in: core/dist/evidence/escalation.d.ts:43

The projection targets that tier admits, intersected with the tier's table.

***

### tier

> `readonly` **tier**: [`CapTier`](../type-aliases/CapTier.md)

Defined in: core/dist/evidence/escalation.d.ts:41

The minimal [CapTier](../type-aliases/CapTier.md) satisfying site, budget, grants, and admissibility.
