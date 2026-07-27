[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / SSEClient

# Interface: SSEClient

Defined in: [\_spine/web.d.ts:267](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L267)

Live resumable SSE client with explicit connection and teardown control.

## Extends

- [`AsyncOwnedResource`](AsyncOwnedResource.md)

## Properties

### backpressure

> `readonly` **backpressure**: [`BackpressureHint`](BackpressureHint.md)

Defined in: [\_spine/web.d.ts:278](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L278)

Current backpressure hint — a plain synchronous read (was `Effect.Effect<BackpressureHint>`).

***

### lastEventId

> `readonly` **lastEventId**: `string` \| `null`

Defined in: [\_spine/web.d.ts:276](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L276)

Current per-connection cursor — a plain synchronous read (was `Effect.Effect<string | null>`).

***

### lifetime

> `readonly` **lifetime**: [`Lifetime`](Lifetime.md)

Defined in: [\_spine/core.d.ts:175](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L175)

#### Inherited from

[`AsyncOwnedResource`](AsyncOwnedResource.md).[`lifetime`](AsyncOwnedResource.md#lifetime)

***

### messages

> `readonly` **messages**: `AsyncIterable`\<[`SSEMessage`](../type-aliases/SSEMessage.md)\>

Defined in: [\_spine/web.d.ts:269](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L269)

Live message stream (was `Stream.Stream<SSEMessage>`).

***

### state

> `readonly` **state**: [`SSEState`](../type-aliases/SSEState.md)

Defined in: [\_spine/web.d.ts:271](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L271)

Current connection state — a plain synchronous read (was `Effect.Effect<SSEState>`).

***

### stateChanges

> `readonly` **stateChanges**: `AsyncIterable`\<[`SSEState`](../type-aliases/SSEState.md)\>

Defined in: [\_spine/web.d.ts:273](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L273)

Live state-transition stream (was `Stream.Stream<SSEState>`).

## Methods

### \[asyncDispose\]()

> **\[asyncDispose\]**(): `Promise`\<`void`\>

Defined in: [\_spine/core.d.ts:177](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L177)

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`AsyncOwnedResource`](AsyncOwnedResource.md).[`[asyncDispose]`](AsyncOwnedResource.md#asyncdispose)

***

### dispose()

> **dispose**(): `Promise`\<`void`\>

Defined in: [\_spine/core.d.ts:176](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L176)

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`AsyncOwnedResource`](AsyncOwnedResource.md).[`dispose`](AsyncOwnedResource.md#dispose)

***

### reconnect()

> **reconnect**(): `void`

Defined in: [\_spine/web.d.ts:274](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L274)

#### Returns

`void`
