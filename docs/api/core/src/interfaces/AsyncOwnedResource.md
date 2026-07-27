[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / AsyncOwnedResource

# Interface: AsyncOwnedResource

Defined in: [core/src/reactive/lifetime.ts:262](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/lifetime.ts#L262)

A resource that owns its teardown through LiteShip's one public lifecycle.
[Lifetime.dispose](Lifetime.md#dispose) returns a promise that settles once every async
finalizer settles, while every synchronous finalizer still runs before the
`dispose()` call returns. `dispose()` delegates to the owning Lifetime; the
`[Symbol.asyncDispose]` well-known method makes it usable with an
`await using` declaration. `lifetime` stays reachable for advanced/debug
composition, but the value IS the disposable — there is no pair to
destructure and separately own. Callers must await disposal when they need
to observe finalizer failure; fire-and-forget disposal is unsupported.

## Extended by

- [`FrameCapture`](FrameCapture.md)

## Properties

### lifetime

> `readonly` **lifetime**: [`Lifetime`](Lifetime.md)

Defined in: [core/src/reactive/lifetime.ts:264](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/lifetime.ts#L264)

The owning disposal handle — for advanced/debug composition only.

## Methods

### \[asyncDispose\]()

> **\[asyncDispose\]**(): `Promise`\<`void`\>

Defined in: [core/src/reactive/lifetime.ts:268](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/lifetime.ts#L268)

Well-known disposer so the resource works with an `await using` declaration.

#### Returns

`Promise`\<`void`\>

***

### dispose()

> **dispose**(): `Promise`\<`void`\>

Defined in: [core/src/reactive/lifetime.ts:266](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/lifetime.ts#L266)

Tear down exactly once; the returned promise settles when async finalizers settle. Idempotent.

#### Returns

`Promise`\<`void`\>
