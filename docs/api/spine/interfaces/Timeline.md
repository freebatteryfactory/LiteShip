[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / Timeline

# Interface: Timeline\<B\>

Defined in: [\_spine/core.d.ts:433](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L433)

Quantizer over time on CellKernel.replay1 ({distinct} state channel, Effect-free, Wave 6)

## Extends

- [`AsyncOwnedResource`](AsyncOwnedResource.md)

## Type Parameters

### B

`B` *extends* [`Boundary`](Boundary.md) = [`Boundary`](Boundary.md)

## Properties

### boundary

> `readonly` **boundary**: `B`

Defined in: [\_spine/core.d.ts:434](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L434)

***

### lifetime

> `readonly` **lifetime**: [`Lifetime`](Lifetime.md)

Defined in: [\_spine/core.d.ts:444](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L444)

#### Overrides

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

### dispose()

> **dispose**(): `Promise`\<`void`\>

Defined in: [\_spine/core.d.ts:182](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L182)

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`AsyncOwnedResource`](AsyncOwnedResource.md).[`dispose`](AsyncOwnedResource.md#dispose)

***

### elapsed()

> **elapsed**(): [`Millis`](../type-aliases/Millis.md)

Defined in: [\_spine/core.d.ts:437](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L437)

#### Returns

[`Millis`](../type-aliases/Millis.md)

***

### pause()

> **pause**(): `void`

Defined in: [\_spine/core.d.ts:440](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L440)

#### Returns

`void`

***

### play()

> **play**(): `void`

Defined in: [\_spine/core.d.ts:439](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L439)

#### Returns

`void`

***

### progress()

> **progress**(): `number`

Defined in: [\_spine/core.d.ts:436](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L436)

#### Returns

`number`

***

### reverse()

> **reverse**(): `void`

Defined in: [\_spine/core.d.ts:441](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L441)

#### Returns

`void`

***

### scrub()

> **scrub**(`progress`): `void`

Defined in: [\_spine/core.d.ts:443](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L443)

#### Parameters

##### progress

`number`

#### Returns

`void`

***

### seek()

> **seek**(`ms`): `void`

Defined in: [\_spine/core.d.ts:442](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L442)

#### Parameters

##### ms

[`Millis`](../type-aliases/Millis.md)

#### Returns

`void`

***

### state()

> **state**(): [`StateUnion`](../type-aliases/StateUnion.md)\<`B`\>

Defined in: [\_spine/core.d.ts:435](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L435)

#### Returns

[`StateUnion`](../type-aliases/StateUnion.md)\<`B`\>

***

### subscribe()

> **subscribe**(`subscriber`): [`Disposer`](../namespaces/CellKernel/type-aliases/Disposer.md)

Defined in: [\_spine/core.d.ts:438](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L438)

#### Parameters

##### subscriber

[`Subscriber`](../namespaces/CellKernel/type-aliases/Subscriber.md)\<[`StateUnion`](../type-aliases/StateUnion.md)\<`B`\>\>

#### Returns

[`Disposer`](../namespaces/CellKernel/type-aliases/Disposer.md)
