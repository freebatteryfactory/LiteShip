[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / projectResponsiveMediaPicture

# Function: projectResponsiveMediaPicture()

> **projectResponsiveMediaPicture**(`intent`, `caps`): [`ResponsiveMediaPictureProjection`](../interfaces/ResponsiveMediaPictureProjection.md)

Defined in: [core/src/responsive-media.ts:206](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/responsive-media.ts#L206)

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
