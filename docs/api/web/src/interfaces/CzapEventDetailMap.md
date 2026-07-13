[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / CzapEventDetailMap

# Interface: CzapEventDetailMap

Defined in: [web/src/wire/czap-events.ts:42](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/czap-events.ts#L42)

Canonical `czap:*` event names and their `CustomEvent.detail` shapes.
Events with `undefined` detail omit `detail` on dispatch.

## Properties

### czap:gpu-ready

> **czap:gpu-ready**: `undefined`

Defined in: [web/src/wire/czap-events.ts:44](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/czap-events.ts#L44)

***

### czap:graph-state

> **czap:graph-state**: [`CzapUniformUpdateDetail`](CzapUniformUpdateDetail.md)

Defined in: [web/src/wire/czap-events.ts:43](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/czap-events.ts#L43)

***

### czap:llm-done

> **czap:llm-done**: `object`

Defined in: [web/src/wire/czap-events.ts:45](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/czap-events.ts#L45)

#### accumulated

> `readonly` **accumulated**: `string`

***

### czap:llm-error

> **czap:llm-error**: `CzapLlmErrorDetail`

Defined in: [web/src/wire/czap-events.ts:46](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/czap-events.ts#L46)

***

### czap:llm-frame

> **czap:llm-frame**: `UIFrame`

Defined in: [web/src/wire/czap-events.ts:47](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/czap-events.ts#L47)

***

### czap:llm-genui

> **czap:llm-genui**: `object`

Defined in: [web/src/wire/czap-events.ts:48](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/czap-events.ts#L48)

#### node

> `readonly` **node**: [`GeneratedUINode`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/genui.d.ts)

#### renderHash

> `readonly` **renderHash**: `string`

***

### czap:llm-start

> **czap:llm-start**: `undefined`

Defined in: [web/src/wire/czap-events.ts:49](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/czap-events.ts#L49)

***

### czap:llm-token

> **czap:llm-token**: `object`

Defined in: [web/src/wire/czap-events.ts:50](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/czap-events.ts#L50)

#### accumulated

> `readonly` **accumulated**: `string`

#### text

> `readonly` **text**: `string`

***

### czap:llm-tool-end

> **czap:llm-tool-end**: `object`

Defined in: [web/src/wire/czap-events.ts:51](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/czap-events.ts#L51)

#### args

> `readonly` **args**: `unknown`

#### name

> `readonly` **name**: `string`

***

### czap:llm-tool-start

> **czap:llm-tool-start**: `object`

Defined in: [web/src/wire/czap-events.ts:52](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/czap-events.ts#L52)

#### name

> `readonly` **name**: `string`

***

### czap:morph-rejected

> **czap:morph-rejected**: [`CzapMorphRejectedDetail`](CzapMorphRejectedDetail.md)

Defined in: [web/src/wire/czap-events.ts:53](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/czap-events.ts#L53)

***

### czap:mutation

> **czap:mutation**: `GraphMutationResponse`

Defined in: [web/src/wire/czap-events.ts:54](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/czap-events.ts#L54)

***

### czap:reinit

> **czap:reinit**: `undefined`

Defined in: [web/src/wire/czap-events.ts:55](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/czap-events.ts#L55)

***

### czap:request-snapshot

> **czap:request-snapshot**: `object`

Defined in: [web/src/wire/czap-events.ts:56](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/czap-events.ts#L56)

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

### czap:satellite-state

> **czap:satellite-state**: [`CzapUniformUpdateDetail`](CzapUniformUpdateDetail.md)

Defined in: [web/src/wire/czap-events.ts:68](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/czap-events.ts#L68)

***

### czap:signal

> **czap:signal**: `unknown`

Defined in: [web/src/wire/czap-events.ts:69](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/czap-events.ts#L69)

***

### czap:slot-mounted

> **czap:slot-mounted**: `object`

Defined in: [web/src/wire/czap-events.ts:70](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/czap-events.ts#L70)

#### mode

> `readonly` **mode**: [`IslandMode`](../type-aliases/IslandMode.md)

#### path

> `readonly` **path**: [`SlotPath`](../type-aliases/SlotPath.md)

***

### czap:slot-unmounted

> **czap:slot-unmounted**: `object`

Defined in: [web/src/wire/czap-events.ts:71](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/czap-events.ts#L71)

#### mode?

> `readonly` `optional` **mode?**: [`IslandMode`](../type-aliases/IslandMode.md)

#### path

> `readonly` **path**: [`SlotPath`](../type-aliases/SlotPath.md)

***

### czap:state

> **czap:state**: [`CzapUniformUpdateDetail`](CzapUniformUpdateDetail.md)

Defined in: [web/src/wire/czap-events.ts:72](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/czap-events.ts#L72)

***

### czap:stream-connected

> **czap:stream-connected**: `undefined`

Defined in: [web/src/wire/czap-events.ts:73](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/czap-events.ts#L73)

***

### czap:stream-disconnected

> **czap:stream-disconnected**: `undefined`

Defined in: [web/src/wire/czap-events.ts:74](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/czap-events.ts#L74)

***

### czap:stream-error

> **czap:stream-error**: [`CzapStreamErrorDetail`](CzapStreamErrorDetail.md)

Defined in: [web/src/wire/czap-events.ts:75](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/czap-events.ts#L75)

***

### czap:stream-morph

> **czap:stream-morph**: `undefined`

Defined in: [web/src/wire/czap-events.ts:76](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/czap-events.ts#L76)

***

### czap:teardown

> **czap:teardown**: `undefined`

Defined in: [web/src/wire/czap-events.ts:77](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/czap-events.ts#L77)

***

### czap:uniform-update

> **czap:uniform-update**: [`CzapUniformUpdateDetail`](CzapUniformUpdateDetail.md)

Defined in: [web/src/wire/czap-events.ts:78](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/czap-events.ts#L78)

***

### czap:wasm-error

> **czap:wasm-error**: `object`

Defined in: [web/src/wire/czap-events.ts:79](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/czap-events.ts#L79)

#### reason

> `readonly` **reason**: `string`

#### url

> `readonly` **url**: `string`

***

### czap:wasm-ready

> **czap:wasm-ready**: `object`

Defined in: [web/src/wire/czap-events.ts:80](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/czap-events.ts#L80)

#### url

> `readonly` **url**: `string`

***

### czap:worker-ready

> **czap:worker-ready**: `undefined`

Defined in: [web/src/wire/czap-events.ts:81](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/czap-events.ts#L81)

***

### czap:worker-state

> **czap:worker-state**: [`CzapUniformUpdateDetail`](CzapUniformUpdateDetail.md)

Defined in: [web/src/wire/czap-events.ts:82](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/czap-events.ts#L82)
