[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / AudioProcessor

# Interface: AudioProcessor

Defined in: [web/src/audio/processor.ts:34](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/audio/processor.ts#L34)

Host-side surface of the AV-sync AudioWorklet processor.

The returned `node` should be connected into the host's audio graph;
the accompanying [AudioProcessor.bridge](#bridge) is shared between the
main thread and the worklet so both sides observe the same
sample-accurate clock. Release it with `await processor.dispose()`; graph
disconnection lands synchronously and the Promise carries teardown failure.

## Extends

- [`AsyncOwnedResource`](../../../liteship/src/reactive/interfaces/AsyncOwnedResource.md)

## Properties

### bridge

> `readonly` **bridge**: `AVBridgeShape`

Defined in: [web/src/audio/processor.ts:38](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/audio/processor.ts#L38)

Shared AV bridge advanced 128 samples per worklet render quantum.

***

### lifetime

> `readonly` **lifetime**: [`Lifetime`](../../../liteship/src/reactive/type-aliases/Lifetime.md)

Defined in: core/dist/reactive/lifetime.d.ts:108

The owning disposal handle — for advanced/debug composition only.

#### Inherited from

[`AsyncOwnedResource`](../../../liteship/src/reactive/interfaces/AsyncOwnedResource.md).[`lifetime`](../../../liteship/src/reactive/interfaces/AsyncOwnedResource.md#lifetime)

***

### node

> `readonly` **node**: `AudioWorkletNode`

Defined in: [web/src/audio/processor.ts:36](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/audio/processor.ts#L36)

The underlying `AudioWorkletNode`. Connect into the graph directly.

## Methods

### \[asyncDispose\]()

> **\[asyncDispose\]**(): `Promise`\<`void`\>

Defined in: core/dist/reactive/lifetime.d.ts:112

Well-known disposer so the resource works with an `await using` declaration.

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`AsyncOwnedResource`](../../../liteship/src/reactive/interfaces/AsyncOwnedResource.md).[`[asyncDispose]`](../../../liteship/src/reactive/interfaces/AsyncOwnedResource.md#asyncdispose)

***

### dispose()

> **dispose**(): `Promise`\<`void`\>

Defined in: core/dist/reactive/lifetime.d.ts:110

Tear down exactly once; the returned promise settles when async finalizers settle. Idempotent.

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`AsyncOwnedResource`](../../../liteship/src/reactive/interfaces/AsyncOwnedResource.md).[`dispose`](../../../liteship/src/reactive/interfaces/AsyncOwnedResource.md#dispose)

***

### start()

> **start**(): `void`

Defined in: [web/src/audio/processor.ts:40](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/audio/processor.ts#L40)

Begin advancing the bridge's sample counter.

#### Returns

`void`

***

### stop()

> **stop**(): `void`

Defined in: [web/src/audio/processor.ts:42](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/audio/processor.ts#L42)

Pause advancement without tearing down the node.

#### Returns

`void`
