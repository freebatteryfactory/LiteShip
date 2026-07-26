[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/astro](../README.md) / ResponsiveMediaHostProjection

# Interface: ResponsiveMediaHostProjection

Defined in: astro/dist/responsive-media.d.ts:27

A host-projected responsive image plus the `Vary` axis the caller must merge.

## Properties

### projection

> `readonly` **projection**: [`ResponsiveMediaPictureProjection`](../../media/interfaces/ResponsiveMediaPictureProjection.md)

Defined in: astro/dist/responsive-media.d.ts:29

The `<picture>` / `<img>` / preload projection, every artifact from the effective set.

***

### vary

> `readonly` **vary**: `string`

Defined in: astro/dist/responsive-media.d.ts:31

The responsive-media `Vary` axis (`Sec-CH-DPR, Save-Data`) to merge into the response.
