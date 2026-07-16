[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / isSchema

# Function: isSchema()

> **isSchema**(`u`): `u is Schema<unknown, unknown>`

Defined in: [core/src/schema/ast.ts:238](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/ast.ts#L238)

Identity guard: is `u` a schema value minted by this kernel? Keyed on the
private `WeakSet` brand, so a look-alike record with a matching shape does NOT
pass — the brand cannot be forged.

## Parameters

### u

`unknown`

## Returns

`u is Schema<unknown, unknown>`
