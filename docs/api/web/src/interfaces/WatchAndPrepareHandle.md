[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [web/src](../README.md) / WatchAndPrepareHandle

# Interface: WatchAndPrepareHandle

Defined in: [web/src/watch-and-prepare.ts:86](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/watch-and-prepare.ts#L86)

Handle returned by [watchAndPrepare](../functions/watchAndPrepare.md) — stamps and applies verifiable patches.

## Extends

- [`AsyncOwnedResource`](../../../liteship/src/reactive/interfaces/AsyncOwnedResource.md)

## Properties

### capability

> `readonly` **capability**: [`DpuCapability`](../type-aliases/DpuCapability.md)

Defined in: [web/src/watch-and-prepare.ts:89](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/watch-and-prepare.ts#L89)

***

### lifetime

> `readonly` **lifetime**: [`Lifetime`](../../../liteship/src/reactive/type-aliases/Lifetime.md)

Defined in: core/dist/reactive/lifetime.d.ts:108

The owning disposal handle — for advanced/debug composition only.

#### Inherited from

[`AsyncOwnedResource`](../../../liteship/src/reactive/interfaces/AsyncOwnedResource.md).[`lifetime`](../../../liteship/src/reactive/interfaces/AsyncOwnedResource.md#lifetime)

***

### marker

> `readonly` **marker**: `string`

Defined in: [web/src/watch-and-prepare.ts:87](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/watch-and-prepare.ts#L87)

***

### target

> `readonly` **target**: `Element`

Defined in: [web/src/watch-and-prepare.ts:88](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/watch-and-prepare.ts#L88)

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

### apply()

> **apply**(`envelope`, `currentBaseGraphId`): [`ApplyVerifiablePatchResult`](../type-aliases/ApplyVerifiablePatchResult.md)

Defined in: [web/src/watch-and-prepare.ts:95](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/watch-and-prepare.ts#L95)

#### Parameters

##### envelope

[`VerifiablePatchEnvelope`](VerifiablePatchEnvelope.md)

##### currentBaseGraphId

[`ContentAddress`](../../../spine/type-aliases/ContentAddress.md)

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

[`AsyncOwnedResource`](../../../liteship/src/reactive/interfaces/AsyncOwnedResource.md).[`dispose`](../../../liteship/src/reactive/interfaces/AsyncOwnedResource.md#dispose)

***

### stamp()

> **stamp**(`input`): [`VerifiablePatchEnvelope`](VerifiablePatchEnvelope.md)

Defined in: [web/src/watch-and-prepare.ts:90](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/watch-and-prepare.ts#L90)

#### Parameters

##### input

###### baseGraphId

[`ContentAddress`](../../../spine/type-aliases/ContentAddress.md)

###### html

`string`

###### resultGraphId

[`ContentAddress`](../../../spine/type-aliases/ContentAddress.md)

#### Returns

[`VerifiablePatchEnvelope`](VerifiablePatchEnvelope.md)
