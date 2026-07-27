[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/runtime](../README.md) / WatchAndPrepareHandle

# Interface: WatchAndPrepareHandle

Defined in: web/dist/dpu/watch-and-prepare.d.ts:91

Handle returned by [watchAndPrepare](../functions/watchAndPrepare.md) — stamps and applies verifiable patches.

## Extends

- [`AsyncOwnedResource`](../../reactive/interfaces/AsyncOwnedResource.md)

## Properties

### capability

> `readonly` **capability**: [`DpuCapability`](../type-aliases/DpuCapability.md)

Defined in: web/dist/dpu/watch-and-prepare.d.ts:94

***

### lifetime

> `readonly` **lifetime**: [`Lifetime`](../../reactive/type-aliases/Lifetime.md)

Defined in: core/dist/reactive/lifetime.d.ts:108

The owning disposal handle — for advanced/debug composition only.

#### Inherited from

[`AsyncOwnedResource`](../../reactive/interfaces/AsyncOwnedResource.md).[`lifetime`](../../reactive/interfaces/AsyncOwnedResource.md#lifetime)

***

### marker

> `readonly` **marker**: `string`

Defined in: web/dist/dpu/watch-and-prepare.d.ts:92

***

### target

> `readonly` **target**: `Element`

Defined in: web/dist/dpu/watch-and-prepare.d.ts:93

## Methods

### \[asyncDispose\]()

> **\[asyncDispose\]**(): `Promise`\<`void`\>

Defined in: core/dist/reactive/lifetime.d.ts:112

Well-known disposer so the resource works with an `await using` declaration.

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`AsyncOwnedResource`](../../reactive/interfaces/AsyncOwnedResource.md).[`[asyncDispose]`](../../reactive/interfaces/AsyncOwnedResource.md#asyncdispose)

***

### apply()

> **apply**(`envelope`, `currentBaseGraphId`): [`ApplyVerifiablePatchResult`](../type-aliases/ApplyVerifiablePatchResult.md)

Defined in: web/dist/dpu/watch-and-prepare.d.ts:100

#### Parameters

##### envelope

[`VerifiablePatchEnvelope`](VerifiablePatchEnvelope.md)

##### currentBaseGraphId

[`ContentAddress`](../../../../spine/type-aliases/ContentAddress.md)

#### Returns

[`ApplyVerifiablePatchResult`](../type-aliases/ApplyVerifiablePatchResult.md)

***

### dispose()

> **dispose**(): `Promise`\<`void`\>

Defined in: core/dist/reactive/lifetime.d.ts:110

Tear down exactly once; the returned promise settles when async finalizers settle. Idempotent.

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`AsyncOwnedResource`](../../reactive/interfaces/AsyncOwnedResource.md).[`dispose`](../../reactive/interfaces/AsyncOwnedResource.md#dispose)

***

### stamp()

> **stamp**(`input`): [`VerifiablePatchEnvelope`](VerifiablePatchEnvelope.md)

Defined in: web/dist/dpu/watch-and-prepare.d.ts:95

#### Parameters

##### input

###### baseGraphId

[`ContentAddress`](../../../../spine/type-aliases/ContentAddress.md)

###### html

`string`

###### resultGraphId

[`ContentAddress`](../../../../spine/type-aliases/ContentAddress.md)

#### Returns

[`VerifiablePatchEnvelope`](VerifiablePatchEnvelope.md)
