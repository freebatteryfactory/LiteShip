[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/astro](../README.md) / ResponsiveMediaCapsSource

# Type Alias: ResponsiveMediaCapsSource

> **ResponsiveMediaCapsSource** = `Headers` \| `ClientHintsHeaders` \| [`ExtendedDeviceCapabilities`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/detect/src/interfaces/ExtendedDeviceCapabilities.md)

Defined in: astro/dist/responsive-media.d.ts:25

Where a host derives Save-Data / DPR caps from: raw request `Headers`, a plain
Client-Hints header bag, or already-parsed `ExtendedDeviceCapabilities` (so a
middleware that parsed them once does not re-parse).
