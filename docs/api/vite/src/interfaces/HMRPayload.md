[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / HMRPayload

# Interface: HMRPayload

Defined in: [vite/src/hmr.ts:30](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/hmr.ts#L30)

Shape of the HMR payload the liteship Vite plugin ships over the Vite
dev-server WebSocket. Handled by [handleHMR](../functions/handleHMR.md) on the client.

## Properties

### boundary

> `readonly` **boundary**: `string`

Defined in: [vite/src/hmr.ts:34](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/hmr.ts#L34)

Boundary id whose compiled output changed.

***

### css?

> `readonly` `optional` **css?**: `string`

Defined in: [vite/src/hmr.ts:36](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/hmr.ts#L36)

New compiled CSS (omitted when only uniforms changed).

***

### type

> `readonly` **type**: `"liteship:update"`

Defined in: [vite/src/hmr.ts:32](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/hmr.ts#L32)

Message discriminator. Always `'liteship:update'`.

***

### uniforms?

> `readonly` `optional` **uniforms?**: `Record`\<`string`, `number`\>

Defined in: [vite/src/hmr.ts:38](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/hmr.ts#L38)

New shader-uniform values (omitted when only CSS changed).
