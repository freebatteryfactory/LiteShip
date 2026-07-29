[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / KVNamespace

# Interface: KVNamespace

Defined in: [\_spine/edge.d.ts:86](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L86)

Minimal key-value namespace capability required by the edge cache.

## Methods

### delete()?

> `optional` **delete**(`key`): `Promise`\<`void`\>

Defined in: [\_spine/edge.d.ts:89](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L89)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`void`\>

***

### get()

> **get**(`key`, `options?`): `Promise`\<`string` \| `null`\>

Defined in: [\_spine/edge.d.ts:87](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L87)

#### Parameters

##### key

`string`

##### options?

###### cacheTtl?

`number`

#### Returns

`Promise`\<`string` \| `null`\>

***

### list()?

> `optional` **list**(`options`): `Promise`\<\{ `cursor?`: `string`; `keys`: readonly `object`[]; `list_complete`: `boolean`; \}\>

Defined in: [\_spine/edge.d.ts:90](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L90)

#### Parameters

##### options

###### cursor?

`string`

###### prefix

`string`

#### Returns

`Promise`\<\{ `cursor?`: `string`; `keys`: readonly `object`[]; `list_complete`: `boolean`; \}\>

***

### put()

> **put**(`key`, `value`, `options?`): `Promise`\<`void`\>

Defined in: [\_spine/edge.d.ts:88](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L88)

#### Parameters

##### key

`string`

##### value

`string`

##### options?

###### expirationTtl?

`number`

#### Returns

`Promise`\<`void`\>
