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

`N` *extends* `"liteship:graph-state"` \| `"liteship:gpu-ready"` \| `"liteship:llm-done"` \| `"liteship:llm-error"` \| `"liteship:llm-frame"` \| `"liteship:llm-genui"` \| `"liteship:llm-start"` \| `"liteship:llm-token"` \| `"liteship:llm-tool-end"` \| `"liteship:llm-tool-start"` \| `"liteship:morph-rejected"` \| `"liteship:mutation"` \| `"liteship:reinit"` \| `"liteship:request-snapshot"` \| `"liteship:adaptive-state"` \| `"liteship:signal"` \| `"liteship:slot-mounted"` \| `"liteship:slot-unmounted"` \| `"liteship:state"` \| `"liteship:stream-connected"` \| `"liteship:stream-disconnected"` \| `"liteship:stream-error"` \| `"liteship:stream-morph"` \| `"liteship:teardown"` \| `"liteship:uniform-update"` \| `"liteship:wasm-error"` \| `"liteship:wasm-ready"` \| `"liteship:worker-ready"` \| `"liteship:worker-state"`

## Parameters

### target

`EventTarget`

### name

`N`

### rest

...`DetailArg`\<`N`\>

## Returns

`boolean`
