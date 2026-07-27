[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / MorphCallbacks

# Interface: MorphCallbacks

Defined in: [\_spine/web.d.ts:102](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L102)

Lifecycle callbacks emitted around a DOM morph operation.

## Methods

### afterAdd()?

> `optional` **afterAdd**(`node`): `void`

Defined in: [\_spine/web.d.ts:104](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L104)

#### Parameters

##### node

`Node`

#### Returns

`void`

***

### beforeAttributeUpdate()?

> `optional` **beforeAttributeUpdate**(`element`, `name`, `value`): `boolean`

Defined in: [\_spine/web.d.ts:105](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L105)

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

Defined in: [\_spine/web.d.ts:103](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L103)

#### Parameters

##### node

`Node`

#### Returns

`boolean`
