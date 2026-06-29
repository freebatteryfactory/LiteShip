[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / GenerateConditionMutantsOptions

# Interface: GenerateConditionMutantsOptions

Defined in: [audit/src/mcdc-engine.ts:112](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mcdc-engine.ts#L112)

Options for [generateConditionMutants](../functions/generateConditionMutants.md).

## Properties

### file?

> `readonly` `optional` **file?**: `string`

Defined in: [audit/src/mcdc-engine.ts:117](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mcdc-engine.ts#L117)

The repo-relative file id stamped onto every condition-mutant (so the MC/DC gate
locates it at a real IR node). Omitted → the `ts.SourceFile`'s own `fileName`.
