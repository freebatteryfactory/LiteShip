[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / LiteshipFetchLayerConfig

# Interface: LiteshipFetchLayerConfig

Defined in: [\_spine/astro.d.ts:147](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L147)

Fetch-layer options including edge-serving and host-rendering decisions.

## Extends

- [`LiteshipMiddlewareConfig`](LiteshipMiddlewareConfig.md)

## Properties

### detect?

> `readonly` `optional` **detect?**: `boolean`

Defined in: [\_spine/astro.d.ts:118](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L118)

#### Inherited from

[`LiteshipMiddlewareConfig`](LiteshipMiddlewareConfig.md).[`detect`](LiteshipMiddlewareConfig.md#detect)

***

### edge?

> `readonly` `optional` **edge?**: [`EdgeHostAdapterConfig`](EdgeHostAdapterConfig.md)

Defined in: [\_spine/astro.d.ts:117](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L117)

#### Inherited from

[`LiteshipMiddlewareConfig`](LiteshipMiddlewareConfig.md).[`edge`](LiteshipMiddlewareConfig.md#edge)

***

### render?

> `readonly` `optional` **render?**: (`resolution`) => `Response`

Defined in: [\_spine/astro.d.ts:149](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L149)

#### Parameters

##### resolution

[`EdgeHostResolution`](EdgeHostResolution.md)

#### Returns

`Response`

***

### serveFromEdge?

> `readonly` `optional` **serveFromEdge?**: (`request`, `resolution`) => `boolean`

Defined in: [\_spine/astro.d.ts:148](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L148)

#### Parameters

##### request

`Request`

##### resolution

[`EdgeHostResolution`](EdgeHostResolution.md)

#### Returns

`boolean`

***

### workers?

> `readonly` `optional` **workers?**: `object`

Defined in: [\_spine/astro.d.ts:119](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L119)

#### coep?

> `readonly` `optional` **coep?**: [`CrossOriginEmbedderPolicy`](../type-aliases/CrossOriginEmbedderPolicy.md)

#### enabled?

> `readonly` `optional` **enabled?**: `boolean`

#### Inherited from

[`LiteshipMiddlewareConfig`](LiteshipMiddlewareConfig.md).[`workers`](LiteshipMiddlewareConfig.md#workers)
