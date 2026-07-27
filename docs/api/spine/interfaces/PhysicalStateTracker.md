[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / PhysicalStateTracker

# Interface: PhysicalStateTracker

Defined in: [\_spine/web.d.ts:78](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L78)

Explicit owner for document-level IME listeners and physical-state capture.

## Extends

- [`AsyncOwnedResource`](AsyncOwnedResource.md)

## Properties

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

> **capture**(`root`): [`PhysicalState`](PhysicalState.md)

Defined in: [\_spine/web.d.ts:79](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L79)

#### Parameters

##### root

`Element`

#### Returns

[`PhysicalState`](PhysicalState.md)

***

### captureIME()

> **captureIME**(): [`IMEState`](IMEState.md) \| `null`

Defined in: [\_spine/web.d.ts:80](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L80)

#### Returns

[`IMEState`](IMEState.md) \| `null`

***

### dispose()

> **dispose**(): `Promise`\<`void`\>

Defined in: [\_spine/core.d.ts:182](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L182)

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`AsyncOwnedResource`](AsyncOwnedResource.md).[`dispose`](AsyncOwnedResource.md#dispose)
