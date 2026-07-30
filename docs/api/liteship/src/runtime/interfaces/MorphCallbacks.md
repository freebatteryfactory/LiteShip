[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/runtime](../README.md) / MorphCallbacks

# Interface: MorphCallbacks

Defined in: web/dist/types.d.ts:115

Morph lifecycle callbacks. `beforeRemove` runs before a non-opaque Element is
removed; returning `false` vetoes that removal. `afterAdd` runs immediately
after a new Element or Text node is inserted. Attribute callbacks run before
an attribute is added, updated, or removed.

## Methods

### afterAdd()?

> `optional` **afterAdd**(`node`): `void`

Defined in: web/dist/types.d.ts:119

Fires immediately after a newly inserted Element or Text node is connected.

#### Parameters

##### node

`Node`

#### Returns

`void`

***

### beforeAttributeUpdate()?

> `optional` **beforeAttributeUpdate**(`element`, `name`, `value`): `boolean`

Defined in: web/dist/types.d.ts:120

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

Defined in: web/dist/types.d.ts:117

Return `false` to keep the element in place; opaque elements bypass this callback and are always kept.

#### Parameters

##### node

`Node`

#### Returns

`boolean`
