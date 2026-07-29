[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / SSEClient

# Interface: SSEClient

Defined in: [\_spine/web.d.ts:289](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L289)

Live resumable SSE client with explicit connection and teardown control.

## Extends

- [`AsyncOwnedResource`](AsyncOwnedResource.md)

## Properties

### backpressure

> `readonly` **backpressure**: [`BackpressureHint`](BackpressureHint.md)

Defined in: [\_spine/web.d.ts:300](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L300)

Current backpressure hint — a plain synchronous read (was `Effect.Effect<BackpressureHint>`).

***

### lastEventId

> `readonly` **lastEventId**: `string` \| `null`

Defined in: [\_spine/web.d.ts:298](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L298)

Current per-connection cursor — a plain synchronous read (was `Effect.Effect<string | null>`).

***

### lifetime

> `readonly` **lifetime**: [`Lifetime`](Lifetime.md)

Defined in: [\_spine/core.d.ts:182](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L182)

#### Inherited from

[`AsyncOwnedResource`](AsyncOwnedResource.md).[`lifetime`](AsyncOwnedResource.md#lifetime)

***

### messages

> `readonly` **messages**: `AsyncIterable`\<[`SSEMessage`](../type-aliases/SSEMessage.md)\>

Defined in: [\_spine/web.d.ts:291](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L291)

Live message stream (was `Stream.Stream<SSEMessage>`).

***

### state

> `readonly` **state**: [`SSEState`](../type-aliases/SSEState.md)

Defined in: [\_spine/web.d.ts:293](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L293)

Current connection state — a plain synchronous read (was `Effect.Effect<SSEState>`).

***

### stateChanges

> `readonly` **stateChanges**: `AsyncIterable`\<[`SSEState`](../type-aliases/SSEState.md)\>

Defined in: [\_spine/web.d.ts:295](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L295)

Live state-transition stream (was `Stream.Stream<SSEState>`).

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

### reconnect()

> **reconnect**(): `void`

Defined in: [\_spine/web.d.ts:296](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L296)

#### Returns

`void`
