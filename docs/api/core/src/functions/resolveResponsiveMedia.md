[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / resolveResponsiveMedia

# Function: resolveResponsiveMedia()

> **resolveResponsiveMedia**(`intent`, `caps`): [`ResolvedResponsiveMedia`](../interfaces/ResolvedResponsiveMedia.md)

Defined in: [core/src/responsive-media.ts:251](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/responsive-media.ts#L251)

Resolve the single best `src` for SSR / fallback `<img>` given capabilities.

A thin projection of [selectCandidates](selectCandidates.md): takes its `resolved` variant and
`reason`. Kept as its own export for hosts that only need the one `src` — but it
derives from the SAME law as `srcset` / `<source>` / preload / image-set, so a
Save-Data client is never SILENTLY served a light `src` while a heavy candidate
leaks through another artifact.

## Parameters

### intent

[`ResponsiveMediaIntent`](../interfaces/ResponsiveMediaIntent.md)

### caps

[`ResponsiveMediaCapabilities`](../interfaces/ResponsiveMediaCapabilities.md)

## Returns

[`ResolvedResponsiveMedia`](../interfaces/ResolvedResponsiveMedia.md)
