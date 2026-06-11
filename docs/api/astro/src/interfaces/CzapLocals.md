[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [astro/src](../README.md) / CzapLocals

# Interface: CzapLocals

Defined in: [astro/src/middleware.ts:31](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/middleware.ts#L31)

Shape of `context.locals.czap` injected by [czapMiddleware](../functions/czapMiddleware.md).
Astro components (and downstream middleware) read this to drive
adaptive rendering decisions.

## Properties

### capabilities

> `readonly` **capabilities**: [`ExtendedDeviceCapabilities`](https://github.com/heyoub/LiteShip/blob/main/docs/api/detect/src/interfaces/ExtendedDeviceCapabilities.md)

Defined in: [astro/src/middleware.ts:39](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/middleware.ts#L39)

Parsed device capabilities.

***

### edge?

> `readonly` `optional` **edge?**: `object`

Defined in: [astro/src/middleware.ts:41](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/middleware.ts#L41)

Edge-host resolution result, present when an edge adapter is configured.

#### boundaries?

> `readonly` `optional` **boundaries?**: `Readonly`\<`Record`\<`string`, `EdgeHostBoundaryResolution`\>\>

Per-boundary outcomes, keyed by name (multi-boundary cache form).

#### cacheStatus

> `readonly` **cacheStatus**: `EdgeHostCacheStatus`

#### compiledOutputs?

> `readonly` `optional` **compiledOutputs?**: `CompiledOutputs`

Sole boundary's outputs; undefined when multiple boundaries are configured.

#### htmlAttributes

> `readonly` **htmlAttributes**: `string`

#### theme?

> `readonly` `optional` **theme?**: `ThemeCompileResult`

***

### tier

> `readonly` **tier**: `object`

Defined in: [astro/src/middleware.ts:33](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/middleware.ts#L33)

Resolved tiers (capability, motion, design).

#### cap

> `readonly` **cap**: `string`

#### design

> `readonly` **design**: `string`

#### motion

> `readonly` **motion**: `string`
