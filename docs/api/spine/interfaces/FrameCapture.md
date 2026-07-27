[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / FrameCapture

# Interface: FrameCapture

Defined in: [\_spine/core.d.ts:1386](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1386)

Live browser capture handle that produces and releases encoded frames.

## Properties

### \_tag

> `readonly` **\_tag**: `"FrameCapture"`

Defined in: [\_spine/core.d.ts:1387](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1387)

## Methods

### capture()

> **capture**(`frame`): `Promise`\<`void`\>

Defined in: [\_spine/core.d.ts:1389](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1389)

#### Parameters

##### frame

[`CaptureFrame`](CaptureFrame.md)

#### Returns

`Promise`\<`void`\>

***

### finalize()

> **finalize**(): `Promise`\<[`CaptureResult`](CaptureResult.md)\>

Defined in: [\_spine/core.d.ts:1390](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1390)

#### Returns

`Promise`\<[`CaptureResult`](CaptureResult.md)\>

***

### init()

> **init**(`config`): `Promise`\<`void`\>

Defined in: [\_spine/core.d.ts:1388](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1388)

#### Parameters

##### config

[`CaptureConfig`](CaptureConfig.md)

#### Returns

`Promise`\<`void`\>
