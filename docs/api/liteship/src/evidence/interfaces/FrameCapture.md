[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/evidence](../README.md) / FrameCapture

# Interface: FrameCapture

Defined in: core/dist/evidence/capture.d.ts:29

Minimal encoder contract: `init` to open the encoder, `capture` per frame,
`finalize` to flush and return the encoded blob, plus LiteShip's one async
owned-resource lifecycle. `finalize` is terminal and releases the encoder;
callers may dispose earlier to abort safely.

## Extends

- [`AsyncOwnedResource`](../../reactive/interfaces/AsyncOwnedResource.md)

## Properties

### \_tag

> `readonly` **\_tag**: `"FrameCapture"`

Defined in: core/dist/evidence/capture.d.ts:30

***

### lifetime

> `readonly` **lifetime**: [`Lifetime`](../../reactive/type-aliases/Lifetime.md)

Defined in: core/dist/reactive/lifetime.d.ts:108

The owning disposal handle — for advanced/debug composition only.

#### Inherited from

[`AsyncOwnedResource`](../../reactive/interfaces/AsyncOwnedResource.md).[`lifetime`](../../reactive/interfaces/AsyncOwnedResource.md#lifetime)

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

### capture()

> **capture**(`frame`): `Promise`\<`void`\>

Defined in: core/dist/evidence/capture.d.ts:32

#### Parameters

##### frame

[`CaptureFrame`](CaptureFrame.md)

#### Returns

`Promise`\<`void`\>

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

### finalize()

> **finalize**(): `Promise`\<[`CaptureResult`](CaptureResult.md)\>

Defined in: core/dist/evidence/capture.d.ts:33

#### Returns

`Promise`\<[`CaptureResult`](CaptureResult.md)\>

***

### init()

> **init**(`config`): `Promise`\<`void`\>

Defined in: core/dist/evidence/capture.d.ts:31

#### Parameters

##### config

[`CaptureConfig`](CaptureConfig.md)

#### Returns

`Promise`\<`void`\>
