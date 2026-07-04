[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / MorphCallbacks

# Interface: MorphCallbacks

Defined in: [web/src/types.ts:147](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L147)

Morph lifecycle callbacks. `beforeRemove` runs before a non-opaque Element is
removed; returning `false` vetoes that removal. `afterAdd` runs immediately
after a new Element or Text node is inserted. Attribute callbacks run before
an attribute is added, updated, or removed.

## Methods

### afterAdd()?

> `optional` **afterAdd**(`node`): `void`

Defined in: [web/src/types.ts:151](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L151)

Fires immediately after a newly inserted Element or Text node is connected.

#### Parameters

##### node

`Node`

#### Returns

`void`

***

### beforeAttributeUpdate()?

> `optional` **beforeAttributeUpdate**(`element`, `name`, `value`): `boolean`

Defined in: [web/src/types.ts:152](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L152)

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

Defined in: [web/src/types.ts:149](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L149)

Return `false` to keep the element in place; opaque elements bypass this callback and are always kept.

#### Parameters

##### node

`Node`

#### Returns

`boolean`
