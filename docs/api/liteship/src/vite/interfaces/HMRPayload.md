[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/vite](../README.md) / HMRPayload

# Interface: HMRPayload

Defined in: vite/dist/hmr.d.ts:22

Shape of the HMR payload the liteship Vite plugin ships over the Vite
dev-server WebSocket. Handled by [handleHMR](../functions/handleHMR.md) on the client.

## Properties

### boundary

> `readonly` **boundary**: `string`

Defined in: vite/dist/hmr.d.ts:26

Boundary id whose compiled output changed.

***

### css?

> `readonly` `optional` **css?**: `string`

Defined in: vite/dist/hmr.d.ts:28

New compiled CSS (omitted when only uniforms changed).

***

### type

> `readonly` **type**: `"liteship:update"`

Defined in: vite/dist/hmr.d.ts:24

Message discriminator. Always `'liteship:update'`.

***

### uniforms?

> `readonly` `optional` **uniforms?**: `Record`\<`string`, `number`\>

Defined in: vite/dist/hmr.d.ts:30

New shader-uniform values (omitted when only CSS changed).
