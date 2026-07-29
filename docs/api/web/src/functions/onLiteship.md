[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [web/src](../README.md) / onLiteship

# Function: onLiteship()

> **onLiteship**\<`N`\>(`target`, `name`, `handler`, `options?`): [`LiteshipEventDisposer`](../type-aliases/LiteshipEventDisposer.md)

Defined in: [web/src/wire/dispatch.ts:39](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/dispatch.ts#L39)

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
