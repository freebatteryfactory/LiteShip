[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [astro/src](../README.md) / CzapLocals

# Interface: CzapLocals

Defined in: [astro/src/middleware.ts:33](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/middleware.ts#L33)

Shape of `context.locals.czap` injected by [czapMiddleware](../functions/czapMiddleware.md).
Astro components (and downstream middleware) read this to drive
adaptive rendering decisions.

## Properties

### capabilities

> `readonly` **capabilities**: [`ExtendedDeviceCapabilities`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/detect/src/interfaces/ExtendedDeviceCapabilities.md)

Defined in: [astro/src/middleware.ts:46](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/middleware.ts#L46)

Parsed device capabilities.

***

### edge?

> `readonly` `optional` **edge?**: `object`

Defined in: [astro/src/middleware.ts:48](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/middleware.ts#L48)

Edge-host resolution result, present when an edge adapter is configured.

#### assetUrl?

> `readonly` `optional` **assetUrl?**: `string`

Sole boundary's immutable static CSS asset URL, when emitted by the build.

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

#### htmlAttributesMap

> `readonly` **htmlAttributesMap**: `Readonly`\<`Record`\<`string`, `string`\>\>

Spreadable `data-czap-<axis>` map for `<html {...htmlAttributesMap}>`.

#### theme?

> `readonly` `optional` **theme?**: `ThemeCompileResult`

***

### tiers

> `readonly` **tiers**: `Readonly`\<\{ `design`: `DesignTier`; `motion`: [`MotionTier`](../../../quantizer/src/type-aliases/MotionTier.md); `tier`: [`CapTier`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/type-aliases/CapTier.md); \}\>

Defined in: [astro/src/middleware.ts:40](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/middleware.ts#L40)

Resolved capability tiers keyed by axis. Each field projects to the
matching `data-czap-<axis>` attribute on `<html>` — the field name and the
attribute name are the same CapAxis key (one source: `CAP_AXES` from
`@czap/detect`), so they can never disagree.
