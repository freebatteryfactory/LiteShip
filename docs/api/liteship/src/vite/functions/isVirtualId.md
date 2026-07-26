[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/vite](../README.md) / isVirtualId

# Function: isVirtualId()

> **isVirtualId**(`id`): `boolean`

Defined in: vite/dist/virtual-modules.d.ts:49

Return `true` when `id` is a fully-resolved liteship virtual module
(null-byte-prefixed). Callers use this to gate `load` handler
dispatch.

## Parameters

### id

`string`

## Returns

`boolean`
