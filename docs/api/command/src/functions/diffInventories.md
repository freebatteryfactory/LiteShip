[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / diffInventories

# Function: diffInventories()

> **diffInventories**(`expected`, `actual`): `object`

Defined in: [command/src/commands/audit-floor-registry.ts:30](https://github.com/heyoub/LiteShip/blob/main/packages/command/src/commands/audit-floor-registry.ts#L30)

Diff two sorted multisets — `added` are in `actual` only, `removed` in `expected` only.

## Parameters

### expected

readonly `string`[]

### actual

readonly `string`[]

## Returns

`object`

### added

> **added**: `string`[]

### removed

> **removed**: `string`[]
