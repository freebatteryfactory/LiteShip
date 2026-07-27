[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / IntegrationConfig

# Interface: IntegrationConfig

Defined in: [\_spine/astro.d.ts:14](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L14)

Options projected into the LiteShip Astro integration and its nested Vite host.

## Properties

### detect?

> `readonly` `optional` **detect?**: `boolean`

Defined in: [\_spine/astro.d.ts:17](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L17)

***

### exclude?

> `readonly` `optional` **exclude?**: readonly `string`[]

Defined in: [\_spine/astro.d.ts:16](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L16)

***

### gpu?

> `readonly` `optional` **gpu?**: `object`

Defined in: [\_spine/astro.d.ts:19](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L19)

#### enabled?

> `readonly` `optional` **enabled?**: `boolean`

#### preferWebGPU?

> `readonly` `optional` **preferWebGPU?**: `boolean`

***

### inspector?

> `readonly` `optional` **inspector?**: `boolean`

Defined in: [\_spine/astro.d.ts:24](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L24)

Dev-only boundary inspector overlay (default enabled in `astro dev`).

***

### llm?

> `readonly` `optional` **llm?**: `object`

Defined in: [\_spine/astro.d.ts:22](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L22)

#### enabled?

> `readonly` `optional` **enabled?**: `boolean`

***

### middleware?

> `readonly` `optional` **middleware?**: `boolean`

Defined in: [\_spine/astro.d.ts:25](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L25)

***

### security?

> `readonly` `optional` **security?**: `object`

Defined in: [\_spine/astro.d.ts:26](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L26)

#### endpointPolicy?

> `readonly` `optional` **endpointPolicy?**: `unknown`

#### htmlPolicy?

> `readonly` `optional` **htmlPolicy?**: `unknown`

***

### stream?

> `readonly` `optional` **stream?**: `object`

Defined in: [\_spine/astro.d.ts:21](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L21)

#### enabled?

> `readonly` `optional` **enabled?**: `boolean`

***

### vite?

> `readonly` `optional` **vite?**: [`PluginConfig`](PluginConfig.md)

Defined in: [\_spine/astro.d.ts:15](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L15)

***

### wasm?

> `readonly` `optional` **wasm?**: `object`

Defined in: [\_spine/astro.d.ts:18](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L18)

#### enabled?

> `readonly` `optional` **enabled?**: `boolean`

#### path?

> `readonly` `optional` **path?**: `string`

***

### workers?

> `readonly` `optional` **workers?**: `object`

Defined in: [\_spine/astro.d.ts:20](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L20)

#### coep?

> `readonly` `optional` **coep?**: [`CrossOriginEmbedderPolicy`](../type-aliases/CrossOriginEmbedderPolicy.md)

#### enabled?

> `readonly` `optional` **enabled?**: `boolean`
