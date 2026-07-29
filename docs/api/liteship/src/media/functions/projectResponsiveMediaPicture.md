[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/media](../README.md) / projectResponsiveMediaPicture

# Function: projectResponsiveMediaPicture()

> **projectResponsiveMediaPicture**(`intent`, `caps`): [`ResponsiveMediaPictureProjection`](../interfaces/ResponsiveMediaPictureProjection.md)

Defined in: core/dist/media/responsive-media.d.ts:117

Project a responsive-media intent to a `<picture>` + fallback `<img>`.

Native markup first: `<source srcset>` per density band; runtime/SSR picks
`resolved.src` on the inner `<img>` for hosts without picture support.

## Parameters

### intent

[`ResponsiveMediaIntent`](../interfaces/ResponsiveMediaIntent.md)

### caps

[`ResponsiveMediaCapabilities`](../interfaces/ResponsiveMediaCapabilities.md)

## Returns

[`ResponsiveMediaPictureProjection`](../interfaces/ResponsiveMediaPictureProjection.md)
