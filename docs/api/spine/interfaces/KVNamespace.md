[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / KVNamespace

# Interface: KVNamespace

Defined in: [\_spine/edge.d.ts:66](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L66)

Minimal key-value namespace capability required by the edge cache.

## Methods

### delete()?

> `optional` **delete**(`key`): `Promise`\<`void`\>

Defined in: [\_spine/edge.d.ts:69](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L69)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`void`\>

***

### get()

> **get**(`key`, `options?`): `Promise`\<`string` \| `null`\>

Defined in: [\_spine/edge.d.ts:67](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L67)

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

Defined in: [\_spine/edge.d.ts:70](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L70)

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

Defined in: [\_spine/edge.d.ts:68](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L68)

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
