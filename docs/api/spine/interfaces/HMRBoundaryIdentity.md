[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / HMRBoundaryIdentity

# Interface: HMRBoundaryIdentity

Defined in: [\_spine/vite.d.ts:216](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/vite.d.ts#L216)

JSON-safe boundary identity sent by the Vite HMR channel.

## Properties

### hysteresis?

> `readonly` `optional` **hysteresis?**: `number`

Defined in: [\_spine/vite.d.ts:221](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/vite.d.ts#L221)

***

### id

> `readonly` **id**: [`ContentAddress`](../type-aliases/ContentAddress.md)

Defined in: [\_spine/vite.d.ts:217](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/vite.d.ts#L217)

***

### input

> `readonly` **input**: `string`

Defined in: [\_spine/vite.d.ts:218](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/vite.d.ts#L218)

***

### spec?

> `readonly` `optional` **spec?**: `object`

Defined in: [\_spine/vite.d.ts:222](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/vite.d.ts#L222)

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

Defined in: [\_spine/vite.d.ts:220](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/vite.d.ts#L220)

***

### thresholds

> `readonly` **thresholds**: readonly `number`[]

Defined in: [\_spine/vite.d.ts:219](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/vite.d.ts#L219)
