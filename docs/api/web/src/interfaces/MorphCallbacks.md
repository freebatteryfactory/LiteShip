[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / MorphCallbacks

# Interface: MorphCallbacks

Defined in: [web/src/types.ts:144](https://github.com/heyoub/LiteShip/blob/main/packages/web/src/types.ts#L144)

Morph lifecycle callbacks.

## Methods

### afterAdd()?

> `optional` **afterAdd**(`node`): `void`

Defined in: [web/src/types.ts:146](https://github.com/heyoub/LiteShip/blob/main/packages/web/src/types.ts#L146)

#### Parameters

##### node

`Node`

#### Returns

`void`

***

### beforeAttributeUpdate()?

> `optional` **beforeAttributeUpdate**(`element`, `name`, `value`): `boolean`

Defined in: [web/src/types.ts:147](https://github.com/heyoub/LiteShip/blob/main/packages/web/src/types.ts#L147)

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

Defined in: [web/src/types.ts:145](https://github.com/heyoub/LiteShip/blob/main/packages/web/src/types.ts#L145)

#### Parameters

##### node

`Node`

#### Returns

`boolean`
