[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [astro/src](../README.md) / CzapLocals

# Interface: CzapLocals

Defined in: [astro/src/middleware.ts:32](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/middleware.ts#L32)

Shape of `context.locals.czap` injected by [czapMiddleware](../functions/czapMiddleware.md).
Astro components (and downstream middleware) read this to drive
adaptive rendering decisions.

## Properties

### capabilities

> `readonly` **capabilities**: [`ExtendedDeviceCapabilities`](https://github.com/heyoub/LiteShip/blob/main/docs/api/detect/src/interfaces/ExtendedDeviceCapabilities.md)

Defined in: [astro/src/middleware.ts:41](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/middleware.ts#L41)

Parsed device capabilities.

***

### edge?

> `readonly` `optional` **edge?**: `object`

Defined in: [astro/src/middleware.ts:43](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/middleware.ts#L43)

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

### tiers

> `readonly` **tiers**: `Readonly`\<`Record`\<`CapAxis`, `string`\>\>

Defined in: [astro/src/middleware.ts:39](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/middleware.ts#L39)

Resolved capability tiers keyed by axis. Each field projects to the
matching `data-czap-<axis>` attribute on `<html>` — the field name and the
attribute name are the same CapAxis key (one source: `CAP_AXES`),
so they can never disagree.
