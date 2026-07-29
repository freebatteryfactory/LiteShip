[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / LiteshipMiddlewareConfig

# Interface: LiteshipMiddlewareConfig

Defined in: [\_spine/astro.d.ts:116](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L116)

Configuration shared by Astro middleware and fetch-layer adapters.

## Extended by

- [`LiteshipFetchLayerConfig`](LiteshipFetchLayerConfig.md)

## Properties

### detect?

> `readonly` `optional` **detect?**: `boolean`

Defined in: [\_spine/astro.d.ts:118](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L118)

***

### edge?

> `readonly` `optional` **edge?**: [`EdgeHostAdapterConfig`](EdgeHostAdapterConfig.md)

Defined in: [\_spine/astro.d.ts:117](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L117)

***

### workers?

> `readonly` `optional` **workers?**: `object`

Defined in: [\_spine/astro.d.ts:119](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L119)

#### coep?

> `readonly` `optional` **coep?**: [`CrossOriginEmbedderPolicy`](../type-aliases/CrossOriginEmbedderPolicy.md)

#### enabled?

> `readonly` `optional` **enabled?**: `boolean`
