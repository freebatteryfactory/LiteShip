[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / Timeline

# Interface: Timeline\<B\>

Defined in: [\_spine/core.d.ts:414](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L414)

Quantizer over time on CellKernel.replay1 ({distinct} state channel, Effect-free, Wave 6)

## Type Parameters

### B

`B` *extends* [`Boundary`](Boundary.md) = [`Boundary`](Boundary.md)

## Properties

### boundary

> `readonly` **boundary**: `B`

Defined in: [\_spine/core.d.ts:415](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L415)

***

### lifetime

> `readonly` **lifetime**: [`Lifetime`](Lifetime.md)

Defined in: [\_spine/core.d.ts:425](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L425)

## Methods

### elapsed()

> **elapsed**(): [`Millis`](../type-aliases/Millis.md)

Defined in: [\_spine/core.d.ts:418](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L418)

#### Returns

[`Millis`](../type-aliases/Millis.md)

***

### pause()

> **pause**(): `void`

Defined in: [\_spine/core.d.ts:421](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L421)

#### Returns

`void`

***

### play()

> **play**(): `void`

Defined in: [\_spine/core.d.ts:420](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L420)

#### Returns

`void`

***

### progress()

> **progress**(): `number`

Defined in: [\_spine/core.d.ts:417](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L417)

#### Returns

`number`

***

### reverse()

> **reverse**(): `void`

Defined in: [\_spine/core.d.ts:422](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L422)

#### Returns

`void`

***

### scrub()

> **scrub**(`progress`): `void`

Defined in: [\_spine/core.d.ts:424](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L424)

#### Parameters

##### progress

`number`

#### Returns

`void`

***

### seek()

> **seek**(`ms`): `void`

Defined in: [\_spine/core.d.ts:423](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L423)

#### Parameters

##### ms

[`Millis`](../type-aliases/Millis.md)

#### Returns

`void`

***

### state()

> **state**(): [`StateUnion`](../type-aliases/StateUnion.md)\<`B`\>

Defined in: [\_spine/core.d.ts:416](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L416)

#### Returns

[`StateUnion`](../type-aliases/StateUnion.md)\<`B`\>

***

### subscribe()

> **subscribe**(`subscriber`): [`Disposer`](../namespaces/CellKernel/type-aliases/Disposer.md)

Defined in: [\_spine/core.d.ts:419](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L419)

#### Parameters

##### subscriber

[`Subscriber`](../namespaces/CellKernel/type-aliases/Subscriber.md)\<[`StateUnion`](../type-aliases/StateUnion.md)\<`B`\>\>

#### Returns

[`Disposer`](../namespaces/CellKernel/type-aliases/Disposer.md)
