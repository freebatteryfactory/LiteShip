[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [astro/src](../README.md) / projectResponsiveMediaForRequest

# Function: projectResponsiveMediaForRequest()

> **projectResponsiveMediaForRequest**(`intent`, `source`): [`ResponsiveMediaHostProjection`](../interfaces/ResponsiveMediaHostProjection.md)

Defined in: [astro/src/responsive-media.ts:47](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/responsive-media.ts#L47)

Project a responsive-media intent for THIS request: derive Save-Data / DPR caps
from Client Hints, project through the effective-candidate law, and return the
responsive `Vary` axis to merge into the response. Under Save-Data + high DPR the
projection advertises ONLY the light candidate — never a heavy one — through every
artifact (`src` / `srcset` / `<source>` / preload `imagesrcset`).

## Parameters

### intent

`ResponsiveMediaIntent`

### source

[`ResponsiveMediaCapsSource`](../type-aliases/ResponsiveMediaCapsSource.md)

## Returns

[`ResponsiveMediaHostProjection`](../interfaces/ResponsiveMediaHostProjection.md)
