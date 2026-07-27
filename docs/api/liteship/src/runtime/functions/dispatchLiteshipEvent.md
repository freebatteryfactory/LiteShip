[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/runtime](../README.md) / dispatchLiteshipEvent

# Function: dispatchLiteshipEvent()

> **dispatchLiteshipEvent**\<`N`\>(`target`, `name`, ...`rest`): `boolean`

Defined in: web/dist/wire/dispatch.d.ts:14

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
