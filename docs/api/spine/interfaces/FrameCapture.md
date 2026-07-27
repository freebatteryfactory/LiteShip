[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / FrameCapture

# Interface: FrameCapture

Defined in: [\_spine/core.d.ts:1623](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1623)

Live browser capture handle with one async-uniform encoder lifecycle.

## Extends

- [`AsyncOwnedResource`](AsyncOwnedResource.md)

## Properties

### \_tag

> `readonly` **\_tag**: `"FrameCapture"`

Defined in: [\_spine/core.d.ts:1624](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1624)

***

### lifetime

> `readonly` **lifetime**: [`Lifetime`](Lifetime.md)

Defined in: [\_spine/core.d.ts:181](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L181)

#### Inherited from

[`AsyncOwnedResource`](AsyncOwnedResource.md).[`lifetime`](AsyncOwnedResource.md#lifetime)

## Methods

### \[asyncDispose\]()

> **\[asyncDispose\]**(): `Promise`\<`void`\>

Defined in: [\_spine/core.d.ts:183](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L183)

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`AsyncOwnedResource`](AsyncOwnedResource.md).[`[asyncDispose]`](AsyncOwnedResource.md#asyncdispose)

***

### capture()

> **capture**(`frame`): `Promise`\<`void`\>

Defined in: [\_spine/core.d.ts:1626](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1626)

#### Parameters

##### frame

[`CaptureFrame`](CaptureFrame.md)

#### Returns

`Promise`\<`void`\>

***

### dispose()

> **dispose**(): `Promise`\<`void`\>

Defined in: [\_spine/core.d.ts:182](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L182)

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`AsyncOwnedResource`](AsyncOwnedResource.md).[`dispose`](AsyncOwnedResource.md#dispose)

***

### finalize()

> **finalize**(): `Promise`\<[`CaptureResult`](CaptureResult.md)\>

Defined in: [\_spine/core.d.ts:1627](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1627)

#### Returns

`Promise`\<[`CaptureResult`](CaptureResult.md)\>

***

### init()

> **init**(`config`): `Promise`\<`void`\>

Defined in: [\_spine/core.d.ts:1625](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1625)

#### Parameters

##### config

[`CaptureConfig`](CaptureConfig.md)

#### Returns

`Promise`\<`void`\>
