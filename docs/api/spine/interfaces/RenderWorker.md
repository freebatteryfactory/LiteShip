[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / RenderWorker

# Interface: RenderWorker

Defined in: [\_spine/worker.d.ts:437](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L437)

Live rendering worker that owns canvas transfer and frame production.

## Extends

- [`AsyncOwnedResource`](AsyncOwnedResource.md)

## Properties

### lifetime

> `readonly` **lifetime**: [`Lifetime`](Lifetime.md)

Defined in: [\_spine/core.d.ts:182](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L182)

#### Inherited from

[`AsyncOwnedResource`](AsyncOwnedResource.md).[`lifetime`](AsyncOwnedResource.md#lifetime)

***

### worker

> `readonly` **worker**: `Worker`

Defined in: [\_spine/worker.d.ts:438](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L438)

## Methods

### \[asyncDispose\]()

> **\[asyncDispose\]**(): `Promise`\<`void`\>

Defined in: [\_spine/core.d.ts:184](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L184)

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`AsyncOwnedResource`](AsyncOwnedResource.md).[`[asyncDispose]`](AsyncOwnedResource.md#asyncdispose)

***

### dispose()

> **dispose**(): `Promise`\<`void`\>

Defined in: [\_spine/core.d.ts:183](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L183)

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`AsyncOwnedResource`](AsyncOwnedResource.md).[`dispose`](AsyncOwnedResource.md#dispose)

***

### onComplete()

> **onComplete**(`callback`): () => `void`

Defined in: [\_spine/worker.d.ts:443](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L443)

#### Parameters

##### callback

(`totalFrames`) => `void`

#### Returns

() => `void`

***

### onFrame()

> **onFrame**(`callback`): () => `void`

Defined in: [\_spine/worker.d.ts:442](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L442)

#### Parameters

##### callback

(`output`) => `void`

#### Returns

() => `void`

***

### startRender()

> **startRender**(`config`): `void`

Defined in: [\_spine/worker.d.ts:440](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L440)

#### Parameters

##### config

[`VideoConfig`](VideoConfig.md)

#### Returns

`void`

***

### stopRender()

> **stopRender**(): `void`

Defined in: [\_spine/worker.d.ts:441](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L441)

#### Returns

`void`

***

### transferCanvas()

> **transferCanvas**(`canvas`): `void`

Defined in: [\_spine/worker.d.ts:439](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L439)

#### Parameters

##### canvas

`OffscreenCanvas`

#### Returns

`void`
