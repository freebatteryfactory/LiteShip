[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / onLiteship

# Function: onLiteship()

> **onLiteship**\<`N`\>(`target`, `name`, `handler`, `options?`): [`LiteshipEventDisposer`](../type-aliases/LiteshipEventDisposer.md)

Defined in: [web/src/wire/dispatch.ts:39](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/dispatch.ts#L39)

Subscribe to a canonical `liteship:*` event; handler receives typed `detail`.

## Type Parameters

### N

`N` *extends* `"liteship:graph-state"` \| `"liteship:gpu-ready"` \| `"liteship:llm-done"` \| `"liteship:llm-error"` \| `"liteship:llm-frame"` \| `"liteship:llm-genui"` \| `"liteship:llm-start"` \| `"liteship:llm-token"` \| `"liteship:llm-tool-end"` \| `"liteship:llm-tool-start"` \| `"liteship:morph-rejected"` \| `"liteship:mutation"` \| `"liteship:reinit"` \| `"liteship:request-snapshot"` \| `"liteship:satellite-state"` \| `"liteship:signal"` \| `"liteship:slot-mounted"` \| `"liteship:slot-unmounted"` \| `"liteship:state"` \| `"liteship:stream-connected"` \| `"liteship:stream-disconnected"` \| `"liteship:stream-error"` \| `"liteship:stream-morph"` \| `"liteship:teardown"` \| `"liteship:uniform-update"` \| `"liteship:wasm-error"` \| `"liteship:wasm-ready"` \| `"liteship:worker-ready"` \| `"liteship:worker-state"`

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
