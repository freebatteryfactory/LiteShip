[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/evidence](../README.md) / FrameCapture

# Interface: FrameCapture

Defined in: core/dist/evidence/capture.d.ts:27

Minimal encoder contract: `init` to open the encoder, `capture` per frame,
`finalize` to flush and return the encoded blob. Implemented by `@liteship/web`
(WebCodecs) and `@liteship/remotion` (Remotion capture).

## Properties

### \_tag

> `readonly` **\_tag**: `"FrameCapture"`

Defined in: core/dist/evidence/capture.d.ts:28

## Methods

### capture()

> **capture**(`frame`): `Promise`\<`void`\>

Defined in: core/dist/evidence/capture.d.ts:30

#### Parameters

##### frame

[`CaptureFrame`](CaptureFrame.md)

#### Returns

`Promise`\<`void`\>

***

### finalize()

> **finalize**(): `Promise`\<[`CaptureResult`](CaptureResult.md)\>

Defined in: core/dist/evidence/capture.d.ts:31

#### Returns

`Promise`\<[`CaptureResult`](CaptureResult.md)\>

***

### init()

> **init**(`config`): `Promise`\<`void`\>

Defined in: core/dist/evidence/capture.d.ts:29

#### Parameters

##### config

[`CaptureConfig`](CaptureConfig.md)

#### Returns

`Promise`\<`void`\>
