[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/runtime](../README.md) / onLiteship

# Function: onLiteship()

> **onLiteship**\<`N`\>(`target`, `name`, `handler`, `options?`): [`LiteshipEventDisposer`](../type-aliases/LiteshipEventDisposer.md)

Defined in: web/dist/wire/dispatch.d.ts:16

Subscribe to a canonical `liteship:*` event; handler receives typed `detail`.

## Type Parameters

### N

`N` *extends* [`LiteshipEventName`](../type-aliases/LiteshipEventName.md)

## Parameters

### target

`EventTarget`

### name

`N`

### handler

(`detail`) => `void`

### options?

`boolean` \| `AddEventListenerOptions`

## Returns

[`LiteshipEventDisposer`](../type-aliases/LiteshipEventDisposer.md)
