[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / resolveVirtualId

# Function: resolveVirtualId()

> **resolveVirtualId**(`id`): `string` \| `undefined`

Defined in: [vite/src/virtual-modules.ts:65](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/virtual-modules.ts#L65)

Resolve a virtual module ID to its internal null-byte-prefixed form
(as expected by Vite's module graph). Returns `undefined` when `id`
is not a recognised liteship virtual module.

## Parameters

### id

`string`

## Returns

`string` \| `undefined`
