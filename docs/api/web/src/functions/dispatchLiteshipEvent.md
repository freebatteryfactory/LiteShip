[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [web/src](../README.md) / dispatchLiteshipEvent

# Function: dispatchLiteshipEvent()

> **dispatchLiteshipEvent**\<`N`\>(`target`, `name`, ...`rest`): `boolean`

Defined in: [web/src/wire/dispatch.ts:24](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/dispatch.ts#L24)

Dispatch a canonical `liteship:*` event on `target`. Detail is required by the type
system when the registry entry carries a payload; omitted otherwise.

## Type Parameters

### N

`N` *extends* [`LiteshipEventName`](../type-aliases/LiteshipEventName.md)

## Parameters

### target

`EventTarget`

### name

`N`

### rest

...`DetailArg`\<`N`\>

## Returns

`boolean`
