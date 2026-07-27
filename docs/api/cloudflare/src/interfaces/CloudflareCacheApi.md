[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [cloudflare/src](../README.md) / CloudflareCacheApi

# Interface: CloudflareCacheApi

Defined in: [cloudflare/src/edge-cache.ts:29](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/cloudflare/src/edge-cache.ts#L29)

Minimal Cloudflare Cache API capability consumed by the edge cache.

## Methods

### delete()?

> `optional` **delete**(`request`): `Promise`\<`boolean`\>

Defined in: [cloudflare/src/edge-cache.ts:32](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/cloudflare/src/edge-cache.ts#L32)

#### Parameters

##### request

`Request`

#### Returns

`Promise`\<`boolean`\>

***

### match()

> **match**(`request`): `Promise`\<`Response` \| `undefined`\>

Defined in: [cloudflare/src/edge-cache.ts:30](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/cloudflare/src/edge-cache.ts#L30)

#### Parameters

##### request

`Request`

#### Returns

`Promise`\<`Response` \| `undefined`\>

***

### put()

> **put**(`request`, `response`): `Promise`\<`void`\>

Defined in: [cloudflare/src/edge-cache.ts:31](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/cloudflare/src/edge-cache.ts#L31)

#### Parameters

##### request

`Request`

##### response

`Response`

#### Returns

`Promise`\<`void`\>
