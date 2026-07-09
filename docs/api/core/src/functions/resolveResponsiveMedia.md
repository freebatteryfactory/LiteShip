[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / resolveResponsiveMedia

# Function: resolveResponsiveMedia()

> **resolveResponsiveMedia**(`intent`, `caps`): [`ResolvedResponsiveMedia`](../interfaces/ResolvedResponsiveMedia.md)

Defined in: [core/src/responsive-media.ts:171](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/responsive-media.ts#L171)

Resolve the single best `src` for SSR / fallback `<img>` given capabilities.

Save-Data wins over DPR: the authored `saveDataVariant` when present, else
the LIGHTEST available variant (`save-data-floor`) — a Save-Data user must
never be served the heavy DPR-matched asset just because the author skipped
the explicit light variant. Otherwise pick the variant whose DPR is closest
without going under the device ratio (floor), else the largest available.

## Parameters

### intent

[`ResponsiveMediaIntent`](../interfaces/ResponsiveMediaIntent.md)

### caps

[`ResponsiveMediaCapabilities`](../interfaces/ResponsiveMediaCapabilities.md)

## Returns

[`ResolvedResponsiveMedia`](../interfaces/ResolvedResponsiveMedia.md)
