[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / IntegrationConfig

# Interface: IntegrationConfig

Defined in: [\_spine/astro.d.ts:23](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L23)

Options projected into the LiteShip Astro integration and its nested Vite host.

## Properties

### adaptive?

> `readonly` `optional` **adaptive?**: `boolean`

Defined in: [\_spine/astro.d.ts:25](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L25)

***

### detect?

> `readonly` `optional` **detect?**: `boolean`

Defined in: [\_spine/astro.d.ts:27](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L27)

***

### exclude?

> `readonly` `optional` **exclude?**: readonly `string`[]

Defined in: [\_spine/astro.d.ts:26](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L26)

***

### gpu?

> `readonly` `optional` **gpu?**: `object`

Defined in: [\_spine/astro.d.ts:29](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L29)

#### enabled?

> `readonly` `optional` **enabled?**: `boolean`

#### preferWebGPU?

> `readonly` `optional` **preferWebGPU?**: `boolean`

***

### inspector?

> `readonly` `optional` **inspector?**: `boolean`

Defined in: [\_spine/astro.d.ts:35](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L35)

Dev-only boundary inspector overlay (default enabled in `astro dev`).

***

### llm?

> `readonly` `optional` **llm?**: `object`

Defined in: [\_spine/astro.d.ts:32](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L32)

#### enabled?

> `readonly` `optional` **enabled?**: `boolean`

***

### middleware?

> `readonly` `optional` **middleware?**: `boolean`

Defined in: [\_spine/astro.d.ts:36](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L36)

***

### motion?

> `readonly` `optional` **motion?**: `object`

Defined in: [\_spine/astro.d.ts:33](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L33)

#### enabled?

> `readonly` `optional` **enabled?**: `boolean`

***

### security?

> `readonly` `optional` **security?**: `object`

Defined in: [\_spine/astro.d.ts:37](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L37)

#### endpointPolicy?

> `readonly` `optional` **endpointPolicy?**: [`RuntimeEndpointPolicy`](RuntimeEndpointPolicy.md)

#### htmlPolicy?

> `readonly` `optional` **htmlPolicy?**: [`RuntimeHtmlPolicy`](RuntimeHtmlPolicy.md)

***

### stream?

> `readonly` `optional` **stream?**: `object`

Defined in: [\_spine/astro.d.ts:31](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L31)

#### enabled?

> `readonly` `optional` **enabled?**: `boolean`

***

### vite?

> `readonly` `optional` **vite?**: [`PluginConfig`](PluginConfig.md)

Defined in: [\_spine/astro.d.ts:24](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L24)

***

### wasm?

> `readonly` `optional` **wasm?**: `object`

Defined in: [\_spine/astro.d.ts:28](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L28)

#### enabled?

> `readonly` `optional` **enabled?**: `boolean`

#### path?

> `readonly` `optional` **path?**: `string`

***

### workers?

> `readonly` `optional` **workers?**: `object`

Defined in: [\_spine/astro.d.ts:30](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L30)

#### coep?

> `readonly` `optional` **coep?**: [`CrossOriginEmbedderPolicy`](../type-aliases/CrossOriginEmbedderPolicy.md)

#### enabled?

> `readonly` `optional` **enabled?**: `boolean`
