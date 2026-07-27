[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / isVirtualId

# Function: isVirtualId()

> **isVirtualId**(`id`): `boolean`

Defined in: [vite/src/virtual-modules.ts:77](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/virtual-modules.ts#L77)

Return `true` when `id` is a fully-resolved liteship virtual module
(null-byte-prefixed). Callers use this to gate `load` handler
dispatch.

## Parameters

### id

`string`

## Returns

`boolean`
