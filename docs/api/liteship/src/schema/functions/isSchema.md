[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/schema](../README.md) / isSchema

# Function: isSchema()

> **isSchema**(`u`): `u is Schema<unknown, unknown>`

Defined in: core/dist/schema/ast.d.ts:184

Identity guard: is `u` a schema value minted by this kernel? Keyed on the
private `WeakSet` brand, so a look-alike record with a matching shape does NOT
pass — the brand cannot be forged.

## Parameters

### u

`unknown`

## Returns

`u is Schema<unknown, unknown>`
