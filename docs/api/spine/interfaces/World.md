[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / World

# Interface: World

Defined in: [\_spine/core.d.ts:785](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L785)

Live ECS world that owns entities, dense stores, and scheduled systems.

## Methods

### addDenseStore()

> **addDenseStore**\<`P`\>(`owned`): `void`

Defined in: [\_spine/core.d.ts:792](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L792)

#### Type Parameters

##### P

`P` *extends* [`Part`](Part.md)\<`number`, `string`, `unknown`\>

#### Parameters

##### owned

[`OwnedDenseStore`](OwnedDenseStore.md)\<`P`\>

#### Returns

`void`

***

### addSystem()

> **addSystem**(`system`): `void`

Defined in: [\_spine/core.d.ts:791](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L791)

#### Parameters

##### system

[`System`](System.md)\<[`PartTuple`](../type-aliases/PartTuple.md), [`PartTuple`](../type-aliases/PartTuple.md), [`PartTuple`](../type-aliases/PartTuple.md)\> \| [`DenseSystem`](DenseSystem.md)\<readonly [`Part`](Part.md)\<`number`, `string`, `unknown`\>[], readonly [`Part`](Part.md)\<`number`, `string`, `unknown`\>[]\>

#### Returns

`void`

***

### despawn()

> **despawn**(`id`): `void`

Defined in: [\_spine/core.d.ts:787](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L787)

#### Parameters

##### id

[`EntityId`](../type-aliases/EntityId.md)

#### Returns

`void`

***

### query()

> **query**\<`P`\>(...`parts`): readonly [`Entity`](Entity.md)\<[`TuplePart`](../type-aliases/TuplePart.md)\<`P`\>\>[]

Defined in: [\_spine/core.d.ts:790](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L790)

#### Type Parameters

##### P

`P` *extends* [`PartTuple`](../type-aliases/PartTuple.md)

#### Parameters

##### parts

...`P`

#### Returns

readonly [`Entity`](Entity.md)\<[`TuplePart`](../type-aliases/TuplePart.md)\<`P`\>\>[]

***

### remove()

> **remove**(`id`, `part`): `void`

Defined in: [\_spine/core.d.ts:789](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L789)

#### Parameters

##### id

[`EntityId`](../type-aliases/EntityId.md)

##### part

[`AnyPart`](../type-aliases/AnyPart.md)

#### Returns

`void`

***

### set()

> **set**\<`P`\>(`id`, `value`): `void`

Defined in: [\_spine/core.d.ts:788](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L788)

#### Type Parameters

##### P

`P` *extends* [`AnyPart`](../type-aliases/AnyPart.md)

#### Parameters

##### id

[`EntityId`](../type-aliases/EntityId.md)

##### value

[`AdmittedPartValue`](AdmittedPartValue.md)\<`P`\>

#### Returns

`void`

***

### spawn()

> **spawn**(...`values`): [`EntityId`](../type-aliases/EntityId.md)

Defined in: [\_spine/core.d.ts:786](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L786)

#### Parameters

##### values

...readonly [`AdmittedPartValue`](AdmittedPartValue.md)\<[`AnyPart`](../type-aliases/AnyPart.md)\>[]

#### Returns

[`EntityId`](../type-aliases/EntityId.md)

***

### tick()

> **tick**(): `void`

Defined in: [\_spine/core.d.ts:793](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L793)

#### Returns

`void`
