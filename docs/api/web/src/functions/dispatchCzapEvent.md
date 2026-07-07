[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / dispatchCzapEvent

# Function: dispatchCzapEvent()

> **dispatchCzapEvent**\<`N`\>(`target`, `name`, ...`rest`): `boolean`

Defined in: [web/src/wire/dispatch.ts:24](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/dispatch.ts#L24)

Dispatch a canonical `czap:*` event on `target`. Detail is required by the type
system when the registry entry carries a payload; omitted otherwise.

## Type Parameters

### N

`N` *extends* `"czap:graph-state"` \| `"czap:gpu-ready"` \| `"czap:llm-done"` \| `"czap:llm-error"` \| `"czap:llm-frame"` \| `"czap:llm-genui"` \| `"czap:llm-start"` \| `"czap:llm-token"` \| `"czap:llm-tool-end"` \| `"czap:llm-tool-start"` \| `"czap:morph-rejected"` \| `"czap:mutation"` \| `"czap:reinit"` \| `"czap:request-snapshot"` \| `"czap:satellite-state"` \| `"czap:signal"` \| `"czap:slot-mounted"` \| `"czap:slot-unmounted"` \| `"czap:state"` \| `"czap:stream-connected"` \| `"czap:stream-disconnected"` \| `"czap:stream-error"` \| `"czap:stream-morph"` \| `"czap:teardown"` \| `"czap:uniform-update"` \| `"czap:wasm-error"` \| `"czap:wasm-ready"` \| `"czap:worker-ready"` \| `"czap:worker-state"`

## Parameters

### target

`EventTarget`

### name

`N`

### rest

...`DetailArg`\<`N`\>

## Returns

`boolean`
