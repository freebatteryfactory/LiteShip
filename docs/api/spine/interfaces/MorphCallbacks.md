[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / MorphCallbacks

# Interface: MorphCallbacks

Defined in: [\_spine/web.d.ts:108](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L108)

Lifecycle callbacks emitted around a DOM morph operation.

## Methods

### afterAdd()?

> `optional` **afterAdd**(`node`): `void`

Defined in: [\_spine/web.d.ts:110](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L110)

#### Parameters

##### node

`Node`

#### Returns

`void`

***

### beforeAttributeUpdate()?

> `optional` **beforeAttributeUpdate**(`element`, `name`, `value`): `boolean`

Defined in: [\_spine/web.d.ts:111](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L111)

#### Parameters

##### element

`Element`

##### name

`string`

##### value

`string` \| `null`

#### Returns

`boolean`

***

### beforeRemove()?

> `optional` **beforeRemove**(`node`): `boolean`

Defined in: [\_spine/web.d.ts:109](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L109)

#### Parameters

##### node

`Node`

#### Returns

`boolean`
