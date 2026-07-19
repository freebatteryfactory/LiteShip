[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / LiteshipEventDetailMap

# Interface: LiteshipEventDetailMap

Defined in: [web/src/wire/liteship-events.ts:43](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/liteship-events.ts#L43)

Canonical `liteship:*` event names and their `CustomEvent.detail` shapes.
Events with `undefined` detail omit `detail` on dispatch.

## Properties

### liteship:gpu-ready

> **liteship:gpu-ready**: `undefined`

Defined in: [web/src/wire/liteship-events.ts:45](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/liteship-events.ts#L45)

***

### liteship:graph-state

> **liteship:graph-state**: [`LiteshipUniformUpdateDetail`](LiteshipUniformUpdateDetail.md)

Defined in: [web/src/wire/liteship-events.ts:44](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/liteship-events.ts#L44)

***

### liteship:llm-done

> **liteship:llm-done**: `object`

Defined in: [web/src/wire/liteship-events.ts:46](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/liteship-events.ts#L46)

#### accumulated

> `readonly` **accumulated**: `string`

***

### liteship:llm-error

> **liteship:llm-error**: `LiteshipLlmErrorDetail`

Defined in: [web/src/wire/liteship-events.ts:47](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/liteship-events.ts#L47)

***

### liteship:llm-frame

> **liteship:llm-frame**: `UIFrame`

Defined in: [web/src/wire/liteship-events.ts:48](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/liteship-events.ts#L48)

***

### liteship:llm-genui

> **liteship:llm-genui**: `object`

Defined in: [web/src/wire/liteship-events.ts:49](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/liteship-events.ts#L49)

#### node

> `readonly` **node**: [`GeneratedUINode`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/genui.d.ts)

#### renderHash

> `readonly` **renderHash**: `string`

***

### liteship:llm-start

> **liteship:llm-start**: `undefined`

Defined in: [web/src/wire/liteship-events.ts:50](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/liteship-events.ts#L50)

***

### liteship:llm-token

> **liteship:llm-token**: `object`

Defined in: [web/src/wire/liteship-events.ts:51](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/liteship-events.ts#L51)

#### accumulated

> `readonly` **accumulated**: `string`

#### text

> `readonly` **text**: `string`

***

### liteship:llm-tool-end

> **liteship:llm-tool-end**: `object`

Defined in: [web/src/wire/liteship-events.ts:52](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/liteship-events.ts#L52)

#### args

> `readonly` **args**: `unknown`

#### name

> `readonly` **name**: `string`

***

### liteship:llm-tool-start

> **liteship:llm-tool-start**: `object`

Defined in: [web/src/wire/liteship-events.ts:53](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/liteship-events.ts#L53)

#### name

> `readonly` **name**: `string`

***

### liteship:morph-rejected

> **liteship:morph-rejected**: [`LiteshipMorphRejectedDetail`](LiteshipMorphRejectedDetail.md)

Defined in: [web/src/wire/liteship-events.ts:54](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/liteship-events.ts#L54)

***

### liteship:mutation

> **liteship:mutation**: `GraphMutationResponse`

Defined in: [web/src/wire/liteship-events.ts:55](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/liteship-events.ts#L55)

***

### liteship:reinit

> **liteship:reinit**: `undefined`

Defined in: [web/src/wire/liteship-events.ts:56](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/liteship-events.ts#L56)

***

### liteship:request-snapshot

> **liteship:request-snapshot**: `object`

Defined in: [web/src/wire/liteship-events.ts:57](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/liteship-events.ts#L57)

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

### liteship:satellite-state

> **liteship:satellite-state**: [`LiteshipUniformUpdateDetail`](LiteshipUniformUpdateDetail.md)

Defined in: [web/src/wire/liteship-events.ts:69](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/liteship-events.ts#L69)

***

### liteship:signal

> **liteship:signal**: `unknown`

Defined in: [web/src/wire/liteship-events.ts:70](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/liteship-events.ts#L70)

***

### liteship:slot-mounted

> **liteship:slot-mounted**: `object`

Defined in: [web/src/wire/liteship-events.ts:71](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/liteship-events.ts#L71)

#### mode

> `readonly` **mode**: [`IslandMode`](../type-aliases/IslandMode.md)

#### path

> `readonly` **path**: [`SlotPath`](../type-aliases/SlotPath.md)

***

### liteship:slot-unmounted

> **liteship:slot-unmounted**: `object`

Defined in: [web/src/wire/liteship-events.ts:72](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/liteship-events.ts#L72)

#### mode?

> `readonly` `optional` **mode?**: [`IslandMode`](../type-aliases/IslandMode.md)

#### path

> `readonly` **path**: [`SlotPath`](../type-aliases/SlotPath.md)

***

### liteship:state

> **liteship:state**: [`LiteshipUniformUpdateDetail`](LiteshipUniformUpdateDetail.md)

Defined in: [web/src/wire/liteship-events.ts:73](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/liteship-events.ts#L73)

***

### liteship:stream-connected

> **liteship:stream-connected**: `undefined`

Defined in: [web/src/wire/liteship-events.ts:74](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/liteship-events.ts#L74)

***

### liteship:stream-disconnected

> **liteship:stream-disconnected**: `undefined`

Defined in: [web/src/wire/liteship-events.ts:75](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/liteship-events.ts#L75)

***

### liteship:stream-error

> **liteship:stream-error**: [`LiteshipStreamErrorDetail`](LiteshipStreamErrorDetail.md)

Defined in: [web/src/wire/liteship-events.ts:76](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/liteship-events.ts#L76)

***

### liteship:stream-morph

> **liteship:stream-morph**: `undefined`

Defined in: [web/src/wire/liteship-events.ts:77](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/liteship-events.ts#L77)

***

### liteship:teardown

> **liteship:teardown**: `undefined`

Defined in: [web/src/wire/liteship-events.ts:78](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/liteship-events.ts#L78)

***

### liteship:uniform-update

> **liteship:uniform-update**: [`LiteshipUniformUpdateDetail`](LiteshipUniformUpdateDetail.md)

Defined in: [web/src/wire/liteship-events.ts:79](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/liteship-events.ts#L79)

***

### liteship:wasm-error

> **liteship:wasm-error**: `object`

Defined in: [web/src/wire/liteship-events.ts:80](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/liteship-events.ts#L80)

#### reason

> `readonly` **reason**: `string`

#### url

> `readonly` **url**: `string`

***

### liteship:wasm-ready

> **liteship:wasm-ready**: `object`

Defined in: [web/src/wire/liteship-events.ts:81](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/liteship-events.ts#L81)

#### url

> `readonly` **url**: `string`

***

### liteship:worker-ready

> **liteship:worker-ready**: `undefined`

Defined in: [web/src/wire/liteship-events.ts:82](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/liteship-events.ts#L82)

***

### liteship:worker-state

> **liteship:worker-state**: [`LiteshipUniformUpdateDetail`](LiteshipUniformUpdateDetail.md)

Defined in: [web/src/wire/liteship-events.ts:83](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/liteship-events.ts#L83)
