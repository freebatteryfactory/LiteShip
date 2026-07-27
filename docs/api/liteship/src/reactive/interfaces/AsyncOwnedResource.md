[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/reactive](../README.md) / AsyncOwnedResource

# Interface: AsyncOwnedResource

Defined in: core/dist/reactive/lifetime.d.ts:106

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

- [`WatchAndPrepareHandle`](../../../../web/src/interfaces/WatchAndPrepareHandle.md)
- [`SSEClient`](../../../../web/src/interfaces/SSEClient.md)
- [`AudioProcessor`](../../../../web/src/interfaces/AudioProcessor.md)
- [`RenderWorker`](../../../../worker/src/interfaces/RenderWorker.md)
- [`WorkerHost`](../../../../worker/src/interfaces/WorkerHost.md)
- [`LLMSession`](../../astro/interfaces/LLMSession.md)
- [`WatchAndPrepareHandle`](../../runtime/interfaces/WatchAndPrepareHandle.md)
- [`SSEClient`](../../runtime/interfaces/SSEClient.md)
- [`AudioProcessor`](../../runtime/interfaces/AudioProcessor.md)

## Properties

### lifetime

> `readonly` **lifetime**: [`Lifetime`](../type-aliases/Lifetime.md)

Defined in: core/dist/reactive/lifetime.d.ts:108

The owning disposal handle — for advanced/debug composition only.

## Methods

### \[asyncDispose\]()

> **\[asyncDispose\]**(): `Promise`\<`void`\>

Defined in: core/dist/reactive/lifetime.d.ts:112

Well-known disposer so the resource works with an `await using` declaration.

#### Returns

`Promise`\<`void`\>

***

### dispose()

> **dispose**(): `Promise`\<`void`\>

Defined in: core/dist/reactive/lifetime.d.ts:110

Tear down exactly once; the returned promise settles when async finalizers settle. Idempotent.

#### Returns

`Promise`\<`void`\>
