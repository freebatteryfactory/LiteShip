[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/astro](../README.md) / projectResponsiveMediaForRequest

# Function: projectResponsiveMediaForRequest()

> **projectResponsiveMediaForRequest**(`intent`, `source`): [`ResponsiveMediaHostProjection`](../interfaces/ResponsiveMediaHostProjection.md)

Defined in: astro/dist/responsive-media.d.ts:40

Project a responsive-media intent for THIS request: derive Save-Data / DPR caps
from Client Hints, project through the effective-candidate law, and return the
responsive `Vary` axis to merge into the response. Under Save-Data + high DPR the
projection advertises ONLY the light candidate — never a heavy one — through every
artifact (`src` / `srcset` / `<source>` / preload `imagesrcset`).

## Parameters

### intent

[`ResponsiveMediaIntent`](../../media/interfaces/ResponsiveMediaIntent.md)

### source

[`ResponsiveMediaCapsSource`](../type-aliases/ResponsiveMediaCapsSource.md)

## Returns

[`ResponsiveMediaHostProjection`](../interfaces/ResponsiveMediaHostProjection.md)
