[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/astro](../README.md) / LiteshipLocals

# Interface: LiteshipLocals

Defined in: astro/dist/middleware.d.ts:18

Shape of `context.locals.liteship` injected by [liteshipMiddleware](../functions/liteshipMiddleware.md).
Astro components (and downstream middleware) read this to drive
adaptive rendering decisions.

## Properties

### capabilities

> `readonly` **capabilities**: [`ExtendedDeviceCapabilities`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/detect/src/interfaces/ExtendedDeviceCapabilities.md)

Defined in: astro/dist/middleware.d.ts:29

Parsed device capabilities.

***

### edge?

> `readonly` `optional` **edge?**: `object`

Defined in: astro/dist/middleware.d.ts:41

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

Spreadable `data-liteship-<axis>` map for `<html {...htmlAttributesMap}>`.

#### theme?

> `readonly` `optional` **theme?**: `ThemeCompileResult`

***

### responsiveMedia

> `readonly` **responsiveMedia**: (`intent`) => [`ResponsiveMediaPictureProjection`](../../media/interfaces/ResponsiveMediaPictureProjection.md)

Defined in: astro/dist/middleware.d.ts:39

Project a responsive-media intent using THIS request's Save-Data / DPR caps
(derived from Client Hints). Every artifact of the returned projection derives
from the ONE effective-candidate law (`selectCandidates`), so a Save-Data client
is never advertised a heavy candidate through `src` / `srcset` / `<source>` /
the preload `imagesrcset`. The middleware also merges the responsive-media `Vary`
axis (`Sec-CH-DPR, Save-Data`) into the response so a CDN keys the light and
normal representations apart (#140).

#### Parameters

##### intent

[`ResponsiveMediaIntent`](../../media/interfaces/ResponsiveMediaIntent.md)

#### Returns

[`ResponsiveMediaPictureProjection`](../../media/interfaces/ResponsiveMediaPictureProjection.md)

***

### tierEvidence

> `readonly` **tierEvidence**: `CapabilityTierEvidence`

Defined in: astro/dist/middleware.d.ts:27

Per-axis observed/inferred provenance behind [tiers](#tiers).

***

### tiers

> `readonly` **tiers**: `CapabilityAxisValues`

Defined in: astro/dist/middleware.d.ts:25

Resolved capability tiers keyed by axis. Each field projects to the
matching `data-liteship-<axis>` attribute on `<html>` — the field name and the
attribute name are the same CapAxis key (one source: `CAP_AXES` from
`@liteship/detect`), so they can never disagree.
