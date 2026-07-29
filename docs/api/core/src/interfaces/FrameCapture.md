[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [core/src](../README.md) / FrameCapture

# Interface: FrameCapture

Defined in: [core/src/evidence/capture.ts:37](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/evidence/capture.ts#L37)

Minimal encoder contract: `init` to open the encoder, `capture` per frame,
`finalize` to flush and return the encoded blob, plus LiteShip's one async
owned-resource lifecycle. `finalize` is terminal and releases the encoder;
callers may dispose earlier to abort safely.

## Extends

- [`AsyncOwnedResource`](AsyncOwnedResource.md)

## Properties

### \_tag

> `readonly` **\_tag**: `"FrameCapture"`

Defined in: [core/src/evidence/capture.ts:38](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/evidence/capture.ts#L38)

***

### lifetime

> `readonly` **lifetime**: [`Lifetime`](Lifetime.md)

Defined in: [core/src/reactive/lifetime.ts:264](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/lifetime.ts#L264)

The owning disposal handle — for advanced/debug composition only.

#### Inherited from

[`AsyncOwnedResource`](AsyncOwnedResource.md).[`lifetime`](AsyncOwnedResource.md#lifetime)

## Methods

### \[asyncDispose\]()

> **\[asyncDispose\]**(): `Promise`\<`void`\>

Defined in: [core/src/reactive/lifetime.ts:268](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/lifetime.ts#L268)

Well-known disposer so the resource works with an `await using` declaration.

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`AsyncOwnedResource`](AsyncOwnedResource.md).[`[asyncDispose]`](AsyncOwnedResource.md#asyncdispose)

***

### capture()

> **capture**(`frame`): `Promise`\<`void`\>

Defined in: [core/src/evidence/capture.ts:40](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/evidence/capture.ts#L40)

#### Parameters

##### frame

[`CaptureFrame`](CaptureFrame.md)

#### Returns

`Promise`\<`void`\>

***

### dispose()

> **dispose**(): `Promise`\<`void`\>

Defined in: [core/src/reactive/lifetime.ts:266](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/lifetime.ts#L266)

Tear down exactly once; the returned promise settles when async finalizers settle. Idempotent.

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`AsyncOwnedResource`](AsyncOwnedResource.md).[`dispose`](AsyncOwnedResource.md#dispose)

***

### finalize()

> **finalize**(): `Promise`\<[`CaptureResult`](CaptureResult.md)\>

Defined in: [core/src/evidence/capture.ts:41](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/evidence/capture.ts#L41)

#### Returns

`Promise`\<[`CaptureResult`](CaptureResult.md)\>

***

### init()

> **init**(`config`): `Promise`\<`void`\>

Defined in: [core/src/evidence/capture.ts:39](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/evidence/capture.ts#L39)

#### Parameters

##### config

[`CaptureConfig`](CaptureConfig.md)

#### Returns

`Promise`\<`void`\>
