[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [astro/src](../README.md) / CzapLocals

# Interface: CzapLocals

Defined in: [astro/src/middleware.ts:35](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/middleware.ts#L35)

Shape of `context.locals.czap` injected by [czapMiddleware](../functions/czapMiddleware.md).
Astro components (and downstream middleware) read this to drive
adaptive rendering decisions.

## Properties

### capabilities

> `readonly` **capabilities**: [`ExtendedDeviceCapabilities`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/detect/src/interfaces/ExtendedDeviceCapabilities.md)

Defined in: [astro/src/middleware.ts:48](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/middleware.ts#L48)

Parsed device capabilities.

***

### edge?

> `readonly` `optional` **edge?**: `object`

Defined in: [astro/src/middleware.ts:60](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/middleware.ts#L60)

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

### responsiveMedia

> `readonly` **responsiveMedia**: (`intent`) => `ResponsiveMediaPictureProjection`

Defined in: [astro/src/middleware.ts:58](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/middleware.ts#L58)

Project a responsive-media intent using THIS request's Save-Data / DPR caps
(derived from Client Hints). Every artifact of the returned projection derives
from the ONE effective-candidate law (`selectCandidates`), so a Save-Data client
is never advertised a heavy candidate through `src` / `srcset` / `<source>` /
the preload `imagesrcset`. The middleware also merges the responsive-media `Vary`
axis (`Sec-CH-DPR, Save-Data`) into the response so a CDN keys the light and
normal representations apart (#140).

#### Parameters

##### intent

`ResponsiveMediaIntent`

#### Returns

`ResponsiveMediaPictureProjection`

***

### tiers

> `readonly` **tiers**: `Readonly`\<\{ `design`: `DesignTier`; `motion`: [`MotionTier`](../../../quantizer/src/type-aliases/MotionTier.md); `tier`: [`CapTier`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/type-aliases/CapTier.md); \}\>

Defined in: [astro/src/middleware.ts:42](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/middleware.ts#L42)

Resolved capability tiers keyed by axis. Each field projects to the
matching `data-czap-<axis>` attribute on `<html>` — the field name and the
attribute name are the same CapAxis key (one source: `CAP_AXES` from
`@czap/detect`), so they can never disagree.
