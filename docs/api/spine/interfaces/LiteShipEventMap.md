[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / LiteShipEventMap

# Interface: LiteShipEventMap

Defined in: [\_spine/events.generated.d.ts:9](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/events.generated.d.ts#L9)

Generated fleet-wide event identity map. Owner catalogs are its only authored source.

## Properties

### liteship:adaptive-state

> **liteship:adaptive-state**: [`ProtocolEvent`](ProtocolEvent.md)\<`"astro"`, `"dom"`, \{ `aria?`: `Readonly`\<`Record`\<`string`, `string`\>\>; `css?`: `Readonly`\<`Record`\<`string`, `string` \| `number`\>\>; `discrete?`: `Readonly`\<`Record`\<`string`, `string`\>\>; `glsl?`: `Readonly`\<`Record`\<`string`, `number`\>\>; `state?`: `string`; `wgsl?`: `Readonly`\<`Record`\<`string`, `unknown`\>\>; \}\>

Defined in: [\_spine/events.generated.d.ts:10](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/events.generated.d.ts#L10)

***

### liteship:detect-ready

> **liteship:detect-ready**: [`ProtocolEvent`](ProtocolEvent.md)\<`"detect"`, `"dom"`, [`DetectReadyDetail`](../type-aliases/DetectReadyDetail.md)\>

Defined in: [\_spine/events.generated.d.ts:18](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/events.generated.d.ts#L18)

***

### liteship:gpu-ready

> **liteship:gpu-ready**: [`ProtocolEvent`](ProtocolEvent.md)\<`"astro"`, `"dom"`, `undefined`\>

Defined in: [\_spine/events.generated.d.ts:19](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/events.generated.d.ts#L19)

***

### liteship:graph-state

> **liteship:graph-state**: [`ProtocolEvent`](ProtocolEvent.md)\<`"astro"`, `"dom"`, \{ `aria?`: `Readonly`\<`Record`\<`string`, `string`\>\>; `css?`: `Readonly`\<`Record`\<`string`, `string` \| `number`\>\>; `discrete?`: `Readonly`\<`Record`\<`string`, `string`\>\>; `glsl?`: `Readonly`\<`Record`\<`string`, `number`\>\>; `state?`: `string`; `wgsl?`: `Readonly`\<`Record`\<`string`, `unknown`\>\>; \}\>

Defined in: [\_spine/events.generated.d.ts:20](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/events.generated.d.ts#L20)

***

### liteship:llm-done

> **liteship:llm-done**: [`ProtocolEvent`](ProtocolEvent.md)\<`"astro"`, `"dom"`, \{ `accumulated`: `string`; \}\>

Defined in: [\_spine/events.generated.d.ts:28](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/events.generated.d.ts#L28)

***

### liteship:llm-error

> **liteship:llm-error**: [`ProtocolEvent`](ProtocolEvent.md)\<`"astro"`, `"dom"`, \{ `message`: `string`; \} \| \{ `reason`: `string`; `strategy`: `string`; \}\>

Defined in: [\_spine/events.generated.d.ts:29](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/events.generated.d.ts#L29)

***

### liteship:llm-frame

> **liteship:llm-frame**: [`ProtocolEvent`](ProtocolEvent.md)\<`"astro"`, `"dom"`, [`UIFrame`](UIFrame.md)\>

Defined in: [\_spine/events.generated.d.ts:30](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/events.generated.d.ts#L30)

***

### liteship:llm-genui

> **liteship:llm-genui**: [`ProtocolEvent`](ProtocolEvent.md)\<`"astro"`, `"dom"`, \{ `node`: [`GeneratedUINode`](GeneratedUINode.md); `renderHash`: `string`; \}\>

Defined in: [\_spine/events.generated.d.ts:31](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/events.generated.d.ts#L31)

***

### liteship:llm-start

> **liteship:llm-start**: [`ProtocolEvent`](ProtocolEvent.md)\<`"astro"`, `"dom"`, `undefined`\>

Defined in: [\_spine/events.generated.d.ts:32](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/events.generated.d.ts#L32)

***

### liteship:llm-token

> **liteship:llm-token**: [`ProtocolEvent`](ProtocolEvent.md)\<`"astro"`, `"dom"`, \{ `accumulated`: `string`; `text`: `string`; \}\>

Defined in: [\_spine/events.generated.d.ts:33](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/events.generated.d.ts#L33)

***

### liteship:llm-tool-end

> **liteship:llm-tool-end**: [`ProtocolEvent`](ProtocolEvent.md)\<`"astro"`, `"dom"`, \{ `args`: `unknown`; `name`: `string`; \}\>

Defined in: [\_spine/events.generated.d.ts:34](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/events.generated.d.ts#L34)

***

### liteship:llm-tool-start

> **liteship:llm-tool-start**: [`ProtocolEvent`](ProtocolEvent.md)\<`"astro"`, `"dom"`, \{ `name`: `string`; \}\>

Defined in: [\_spine/events.generated.d.ts:35](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/events.generated.d.ts#L35)

***

### liteship:morph-rejected

> **liteship:morph-rejected**: [`ProtocolEvent`](ProtocolEvent.md)\<`"web"`, `"dom"`, [`MorphRejection`](MorphRejection.md) & `object`\>

Defined in: [\_spine/events.generated.d.ts:36](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/events.generated.d.ts#L36)

***

### liteship:mutation

> **liteship:mutation**: [`ProtocolEvent`](ProtocolEvent.md)\<`"web"`, `"dom"`, [`GraphMutationResponse`](../type-aliases/GraphMutationResponse.md)\>

Defined in: [\_spine/events.generated.d.ts:37](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/events.generated.d.ts#L37)

***

### liteship:reinit

> **liteship:reinit**: [`ProtocolEvent`](ProtocolEvent.md)\<`"astro"`, `"dom"`, `undefined`\>

Defined in: [\_spine/events.generated.d.ts:38](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/events.generated.d.ts#L38)

***

### liteship:request-snapshot

> **liteship:request-snapshot**: [`ProtocolEvent`](ProtocolEvent.md)\<`"web"`, `"dom"`, \{ `domStale?`: `boolean`; `reason`: `string`; \}\>

Defined in: [\_spine/events.generated.d.ts:39](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/events.generated.d.ts#L39)

***

### liteship:scene-update

> **liteship:scene-update**: [`ProtocolEvent`](ProtocolEvent.md)\<`"scene"`, `"vite-hmr"`, \{ `sceneId`: `string`; \}\>

Defined in: [\_spine/events.generated.d.ts:40](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/events.generated.d.ts#L40)

***

### liteship:signal

> **liteship:signal**: [`ProtocolEvent`](ProtocolEvent.md)\<`"astro"`, `"dom"`, `unknown`\>

Defined in: [\_spine/events.generated.d.ts:41](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/events.generated.d.ts#L41)

***

### liteship:slot-mounted

> **liteship:slot-mounted**: [`ProtocolEvent`](ProtocolEvent.md)\<`"web"`, `"dom"`, \{ `mode`: [`IslandMode`](../type-aliases/IslandMode.md); `path`: [`SlotPath`](../type-aliases/SlotPath.md); \}\>

Defined in: [\_spine/events.generated.d.ts:42](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/events.generated.d.ts#L42)

***

### liteship:slot-unmounted

> **liteship:slot-unmounted**: [`ProtocolEvent`](ProtocolEvent.md)\<`"web"`, `"dom"`, \{ `mode?`: [`IslandMode`](../type-aliases/IslandMode.md); `path`: [`SlotPath`](../type-aliases/SlotPath.md); \}\>

Defined in: [\_spine/events.generated.d.ts:46](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/events.generated.d.ts#L46)

***

### liteship:state

> **liteship:state**: [`ProtocolEvent`](ProtocolEvent.md)\<`"astro"`, `"dom"`, \{ `aria?`: `Readonly`\<`Record`\<`string`, `string`\>\>; `css?`: `Readonly`\<`Record`\<`string`, `string` \| `number`\>\>; `discrete?`: `Readonly`\<`Record`\<`string`, `string`\>\>; `glsl?`: `Readonly`\<`Record`\<`string`, `number`\>\>; `state?`: `string`; `wgsl?`: `Readonly`\<`Record`\<`string`, `unknown`\>\>; \}\>

Defined in: [\_spine/events.generated.d.ts:50](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/events.generated.d.ts#L50)

***

### liteship:stream-connected

> **liteship:stream-connected**: [`ProtocolEvent`](ProtocolEvent.md)\<`"astro"`, `"dom"`, `undefined`\>

Defined in: [\_spine/events.generated.d.ts:58](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/events.generated.d.ts#L58)

***

### liteship:stream-disconnected

> **liteship:stream-disconnected**: [`ProtocolEvent`](ProtocolEvent.md)\<`"astro"`, `"dom"`, `undefined`\>

Defined in: [\_spine/events.generated.d.ts:59](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/events.generated.d.ts#L59)

***

### liteship:stream-error

> **liteship:stream-error**: [`ProtocolEvent`](ProtocolEvent.md)\<`"web"`, `"dom"`, \{ `message?`: `string`; `reason`: `string`; \}\>

Defined in: [\_spine/events.generated.d.ts:60](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/events.generated.d.ts#L60)

***

### liteship:stream-morph

> **liteship:stream-morph**: [`ProtocolEvent`](ProtocolEvent.md)\<`"astro"`, `"dom"`, `undefined`\>

Defined in: [\_spine/events.generated.d.ts:61](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/events.generated.d.ts#L61)

***

### liteship:teardown

> **liteship:teardown**: [`ProtocolEvent`](ProtocolEvent.md)\<`"astro"`, `"dom"`, `undefined`\>

Defined in: [\_spine/events.generated.d.ts:62](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/events.generated.d.ts#L62)

***

### liteship:uniform-update

> **liteship:uniform-update**: [`ProtocolEvent`](ProtocolEvent.md)\<`"web"`, `"dom"`, \{ `aria?`: `Readonly`\<`Record`\<`string`, `string`\>\>; `css?`: `Readonly`\<`Record`\<`string`, `string` \| `number`\>\>; `discrete?`: `Readonly`\<`Record`\<`string`, `string`\>\>; `glsl?`: `Readonly`\<`Record`\<`string`, `number`\>\>; `state?`: `string`; `wgsl?`: `Readonly`\<`Record`\<`string`, `unknown`\>\>; \}\>

Defined in: [\_spine/events.generated.d.ts:63](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/events.generated.d.ts#L63)

***

### liteship:update

> **liteship:update**: [`ProtocolEvent`](ProtocolEvent.md)\<`"vite"`, `"vite-hmr"`, [`HMRPayload`](HMRPayload.md)\>

Defined in: [\_spine/events.generated.d.ts:71](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/events.generated.d.ts#L71)

***

### liteship:wasm-error

> **liteship:wasm-error**: [`ProtocolEvent`](ProtocolEvent.md)\<`"astro"`, `"dom"`, \{ `reason`: `string`; `url`: `string`; \}\>

Defined in: [\_spine/events.generated.d.ts:72](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/events.generated.d.ts#L72)

***

### liteship:wasm-ready

> **liteship:wasm-ready**: [`ProtocolEvent`](ProtocolEvent.md)\<`"astro"`, `"dom"`, \{ `url`: `string`; \}\>

Defined in: [\_spine/events.generated.d.ts:73](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/events.generated.d.ts#L73)

***

### liteship:worker-ready

> **liteship:worker-ready**: [`ProtocolEvent`](ProtocolEvent.md)\<`"astro"`, `"dom"`, `undefined`\>

Defined in: [\_spine/events.generated.d.ts:74](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/events.generated.d.ts#L74)

***

### liteship:worker-state

> **liteship:worker-state**: [`ProtocolEvent`](ProtocolEvent.md)\<`"astro"`, `"dom"`, \{ `aria?`: `Readonly`\<`Record`\<`string`, `string`\>\>; `css?`: `Readonly`\<`Record`\<`string`, `string` \| `number`\>\>; `discrete?`: `Readonly`\<`Record`\<`string`, `string`\>\>; `glsl?`: `Readonly`\<`Record`\<`string`, `number`\>\>; `state?`: `string`; `wgsl?`: `Readonly`\<`Record`\<`string`, `unknown`\>\>; \}\>

Defined in: [\_spine/events.generated.d.ts:75](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/events.generated.d.ts#L75)
