[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [astro/src](../README.md) / ResponsiveMediaHostProjection

# Interface: ResponsiveMediaHostProjection

Defined in: [astro/src/responsive-media.ts:33](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/responsive-media.ts#L33)

A host-projected responsive image plus the `Vary` axis the caller must merge.

## Properties

### projection

> `readonly` **projection**: `ResponsiveMediaPictureProjection`

Defined in: [astro/src/responsive-media.ts:35](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/responsive-media.ts#L35)

The `<picture>` / `<img>` / preload projection, every artifact from the effective set.

***

### vary

> `readonly` **vary**: `string`

Defined in: [astro/src/responsive-media.ts:37](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/responsive-media.ts#L37)

The responsive-media `Vary` axis (`Sec-CH-DPR, Save-Data`) to merge into the response.
