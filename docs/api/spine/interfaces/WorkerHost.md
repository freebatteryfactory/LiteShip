[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / WorkerHost

# Interface: WorkerHost

Defined in: [\_spine/worker.d.ts:472](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L472)

Host coordinator that owns worker transport, state, and teardown.

## Extends

- [`AsyncOwnedResource`](AsyncOwnedResource.md)

## Properties

### compositor

> `readonly` **compositor**: [`CompositorWorker`](../type-aliases/CompositorWorker.md)

Defined in: [\_spine/worker.d.ts:473](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L473)

***

### lifetime

> `readonly` **lifetime**: [`Lifetime`](Lifetime.md)

Defined in: [\_spine/core.d.ts:175](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L175)

#### Inherited from

[`AsyncOwnedResource`](AsyncOwnedResource.md).[`lifetime`](AsyncOwnedResource.md#lifetime)

***

### renderer

> `readonly` **renderer**: [`RenderWorker`](../type-aliases/RenderWorker.md) \| `null`

Defined in: [\_spine/worker.d.ts:474](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L474)

## Methods

### \[asyncDispose\]()

> **\[asyncDispose\]**(): `Promise`\<`void`\>

Defined in: [\_spine/core.d.ts:177](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L177)

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`AsyncOwnedResource`](AsyncOwnedResource.md).[`[asyncDispose]`](AsyncOwnedResource.md#asyncdispose)

***

### attachCanvas()

> **attachCanvas**(`canvas`): `void`

Defined in: [\_spine/worker.d.ts:475](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L475)

#### Parameters

##### canvas

[`TransferableCanvas`](TransferableCanvas.md)

#### Returns

`void`

***

### dispose()

> **dispose**(): `Promise`\<`void`\>

Defined in: [\_spine/core.d.ts:176](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L176)

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`AsyncOwnedResource`](AsyncOwnedResource.md).[`dispose`](AsyncOwnedResource.md#dispose)

***

### onState()

> **onState**(`callback`): () => `void`

Defined in: [\_spine/worker.d.ts:478](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L478)

#### Parameters

##### callback

(`state`) => `void`

#### Returns

() => `void`

***

### startRender()

> **startRender**(`config`): `void`

Defined in: [\_spine/worker.d.ts:476](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L476)

#### Parameters

##### config

[`WorkerHostRenderConfig`](WorkerHostRenderConfig.md)

#### Returns

`void`

***

### stopRender()

> **stopRender**(): `void`

Defined in: [\_spine/worker.d.ts:477](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L477)

#### Returns

`void`
