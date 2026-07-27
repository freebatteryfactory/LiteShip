[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/runtime](../README.md) / LiteshipEventDetailMap

# Interface: LiteshipEventDetailMap

Defined in: web/dist/wire/liteship-events.d.ts:41

Canonical `liteship:*` event names and their `CustomEvent.detail` shapes.
Events with `undefined` detail omit `detail` on dispatch.

## Properties

### liteship:adaptive-state

> **liteship:adaptive-state**: [`LiteshipUniformUpdateDetail`](LiteshipUniformUpdateDetail.md)

Defined in: web/dist/wire/liteship-events.d.ts:80

***

### liteship:gpu-ready

> **liteship:gpu-ready**: `undefined`

Defined in: web/dist/wire/liteship-events.d.ts:43

***

### liteship:graph-state

> **liteship:graph-state**: [`LiteshipUniformUpdateDetail`](LiteshipUniformUpdateDetail.md)

Defined in: web/dist/wire/liteship-events.d.ts:42

***

### liteship:llm-done

> **liteship:llm-done**: `object`

Defined in: web/dist/wire/liteship-events.d.ts:44

#### accumulated

> `readonly` **accumulated**: `string`

***

### liteship:llm-error

> **liteship:llm-error**: `LiteshipLlmErrorDetail`

Defined in: web/dist/wire/liteship-events.d.ts:47

***

### liteship:llm-frame

> **liteship:llm-frame**: [`UIFrame`](../../media/interfaces/UIFrame.md)

Defined in: web/dist/wire/liteship-events.d.ts:48

***

### liteship:llm-genui

> **liteship:llm-genui**: `object`

Defined in: web/dist/wire/liteship-events.d.ts:49

#### node

> `readonly` **node**: [`GeneratedUINode`](../../../../spine/interfaces/GeneratedUINode.md)

#### renderHash

> `readonly` **renderHash**: `string`

***

### liteship:llm-start

> **liteship:llm-start**: `undefined`

Defined in: web/dist/wire/liteship-events.d.ts:53

***

### liteship:llm-token

> **liteship:llm-token**: `object`

Defined in: web/dist/wire/liteship-events.d.ts:54

#### accumulated

> `readonly` **accumulated**: `string`

#### text

> `readonly` **text**: `string`

***

### liteship:llm-tool-end

> **liteship:llm-tool-end**: `object`

Defined in: web/dist/wire/liteship-events.d.ts:58

#### args

> `readonly` **args**: `unknown`

#### name

> `readonly` **name**: `string`

***

### liteship:llm-tool-start

> **liteship:llm-tool-start**: `object`

Defined in: web/dist/wire/liteship-events.d.ts:62

#### name

> `readonly` **name**: `string`

***

### liteship:morph-rejected

> **liteship:morph-rejected**: [`LiteshipMorphRejectedDetail`](LiteshipMorphRejectedDetail.md)

Defined in: web/dist/wire/liteship-events.d.ts:65

***

### liteship:mutation

> **liteship:mutation**: [`GraphMutationResponse`](../../graph/type-aliases/GraphMutationResponse.md)

Defined in: web/dist/wire/liteship-events.d.ts:66

***

### liteship:reinit

> **liteship:reinit**: `undefined`

Defined in: web/dist/wire/liteship-events.d.ts:67

***

### liteship:request-snapshot

> **liteship:request-snapshot**: `object`

Defined in: web/dist/wire/liteship-events.d.ts:68

#### domStale?

> `readonly` `optional` **domStale?**: `boolean`

Whether the rendered DOM is known STALE (overrides the recovery binding's default).
A morph-rejection trigger omits it (the binding treats the DOM as stale). A trigger
whose DOM is intact — a receipt-only resume that applies a state crossing without any
failed morph — passes `false` so recovery gap-replays the crossing WITHOUT an
unnecessary snapshot floor (which would false-error absent a snapshot URL, or needlessly
replace fresh DOM).

#### reason

> `readonly` **reason**: `string`

***

### liteship:signal

> **liteship:signal**: `unknown`

Defined in: web/dist/wire/liteship-events.d.ts:81

***

### liteship:slot-mounted

> **liteship:slot-mounted**: `object`

Defined in: web/dist/wire/liteship-events.d.ts:82

#### mode

> `readonly` **mode**: [`IslandMode`](../type-aliases/IslandMode.md)

#### path

> `readonly` **path**: [`SlotPath`](../type-aliases/SlotPath.md)

***

### liteship:slot-unmounted

> **liteship:slot-unmounted**: `object`

Defined in: web/dist/wire/liteship-events.d.ts:86

#### mode?

> `readonly` `optional` **mode?**: [`IslandMode`](../type-aliases/IslandMode.md)

#### path

> `readonly` **path**: [`SlotPath`](../type-aliases/SlotPath.md)

***

### liteship:state

> **liteship:state**: [`LiteshipUniformUpdateDetail`](LiteshipUniformUpdateDetail.md)

Defined in: web/dist/wire/liteship-events.d.ts:90

***

### liteship:stream-connected

> **liteship:stream-connected**: `undefined`

Defined in: web/dist/wire/liteship-events.d.ts:91

***

### liteship:stream-disconnected

> **liteship:stream-disconnected**: `undefined`

Defined in: web/dist/wire/liteship-events.d.ts:92

***

### liteship:stream-error

> **liteship:stream-error**: [`LiteshipStreamErrorDetail`](LiteshipStreamErrorDetail.md)

Defined in: web/dist/wire/liteship-events.d.ts:93

***

### liteship:stream-morph

> **liteship:stream-morph**: `undefined`

Defined in: web/dist/wire/liteship-events.d.ts:94

***

### liteship:teardown

> **liteship:teardown**: `undefined`

Defined in: web/dist/wire/liteship-events.d.ts:95

***

### liteship:uniform-update

> **liteship:uniform-update**: [`LiteshipUniformUpdateDetail`](LiteshipUniformUpdateDetail.md)

Defined in: web/dist/wire/liteship-events.d.ts:96

***

### liteship:wasm-error

> **liteship:wasm-error**: `object`

Defined in: web/dist/wire/liteship-events.d.ts:97

#### reason

> `readonly` **reason**: `string`

#### url

> `readonly` **url**: `string`

***

### liteship:wasm-ready

> **liteship:wasm-ready**: `object`

Defined in: web/dist/wire/liteship-events.d.ts:101

#### url

> `readonly` **url**: `string`

***

### liteship:worker-ready

> **liteship:worker-ready**: `undefined`

Defined in: web/dist/wire/liteship-events.d.ts:104

***

### liteship:worker-state

> **liteship:worker-state**: [`LiteshipUniformUpdateDetail`](LiteshipUniformUpdateDetail.md)

Defined in: web/dist/wire/liteship-events.d.ts:105
