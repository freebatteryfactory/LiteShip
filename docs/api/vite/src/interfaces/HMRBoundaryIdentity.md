[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [vite/src](../README.md) / HMRBoundaryIdentity

# Interface: HMRBoundaryIdentity

Defined in: [vite/src/hmr.ts:16](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/hmr.ts#L16)

JSON-safe boundary identity emitted by Core and consumed by Astro.

## Properties

### hysteresis?

> `readonly` `optional` **hysteresis?**: `number`

Defined in: [vite/src/hmr.ts:21](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/hmr.ts#L21)

***

### id

> `readonly` **id**: [`ContentAddress`](../../../spine/type-aliases/ContentAddress.md)

Defined in: [vite/src/hmr.ts:17](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/hmr.ts#L17)

***

### input

> `readonly` **input**: `string`

Defined in: [vite/src/hmr.ts:18](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/hmr.ts#L18)

***

### spec?

> `readonly` `optional` **spec?**: `object`

Defined in: [vite/src/hmr.ts:22](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/hmr.ts#L22)

#### experimentId?

> `readonly` `optional` **experimentId?**: `string`

#### timeRange?

> `readonly` `optional` **timeRange?**: `object`

##### timeRange.from?

> `readonly` `optional` **from?**: `number`

##### timeRange.until?

> `readonly` `optional` **until?**: `number`

***

### states

> `readonly` **states**: readonly \[`string`, `string`\]

Defined in: [vite/src/hmr.ts:20](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/hmr.ts#L20)

***

### thresholds

> `readonly` **thresholds**: readonly `number`[]

Defined in: [vite/src/hmr.ts:19](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/hmr.ts#L19)
