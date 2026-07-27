[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / LiteshipMiddlewareConfig

# Interface: LiteshipMiddlewareConfig

Defined in: [\_spine/astro.d.ts:69](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L69)

Configuration shared by Astro middleware and fetch-layer adapters.

## Extended by

- [`LiteshipFetchLayerConfig`](LiteshipFetchLayerConfig.md)

## Properties

### detect?

> `readonly` `optional` **detect?**: `boolean`

Defined in: [\_spine/astro.d.ts:71](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L71)

***

### edge?

> `readonly` `optional` **edge?**: [`EdgeHostAdapterConfig`](EdgeHostAdapterConfig.md)

Defined in: [\_spine/astro.d.ts:70](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L70)

***

### workers?

> `readonly` `optional` **workers?**: `object`

Defined in: [\_spine/astro.d.ts:72](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L72)

#### coep?

> `readonly` `optional` **coep?**: [`CrossOriginEmbedderPolicy`](../type-aliases/CrossOriginEmbedderPolicy.md)

#### enabled?

> `readonly` `optional` **enabled?**: `boolean`
