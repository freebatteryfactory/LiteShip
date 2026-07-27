[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / LiteshipFetchLayerConfig

# Interface: LiteshipFetchLayerConfig

Defined in: [\_spine/astro.d.ts:102](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L102)

Fetch-layer options including edge-serving and host-rendering decisions.

## Extends

- [`LiteshipMiddlewareConfig`](LiteshipMiddlewareConfig.md)

## Properties

### detect?

> `readonly` `optional` **detect?**: `boolean`

Defined in: [\_spine/astro.d.ts:71](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L71)

#### Inherited from

[`LiteshipMiddlewareConfig`](LiteshipMiddlewareConfig.md).[`detect`](LiteshipMiddlewareConfig.md#detect)

***

### edge?

> `readonly` `optional` **edge?**: [`EdgeHostAdapterConfig`](EdgeHostAdapterConfig.md)

Defined in: [\_spine/astro.d.ts:70](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L70)

#### Inherited from

[`LiteshipMiddlewareConfig`](LiteshipMiddlewareConfig.md).[`edge`](LiteshipMiddlewareConfig.md#edge)

***

### render?

> `readonly` `optional` **render?**: (`resolution`) => `Response`

Defined in: [\_spine/astro.d.ts:104](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L104)

#### Parameters

##### resolution

[`EdgeHostResolution`](EdgeHostResolution.md)

#### Returns

`Response`

***

### serveFromEdge?

> `readonly` `optional` **serveFromEdge?**: (`request`, `resolution`) => `boolean`

Defined in: [\_spine/astro.d.ts:103](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L103)

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

Defined in: [\_spine/astro.d.ts:72](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L72)

#### coep?

> `readonly` `optional` **coep?**: [`CrossOriginEmbedderPolicy`](../type-aliases/CrossOriginEmbedderPolicy.md)

#### enabled?

> `readonly` `optional` **enabled?**: `boolean`

#### Inherited from

[`LiteshipMiddlewareConfig`](LiteshipMiddlewareConfig.md).[`workers`](LiteshipMiddlewareConfig.md#workers)
