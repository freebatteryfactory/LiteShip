[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / ResponsiveMediaCandidateSet

# Interface: ResponsiveMediaCandidateSet

Defined in: [core/src/responsive-media.ts:58](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/responsive-media.ts#L58)

The EFFECTIVE candidate set — the single law every responsive-media output derives
from ([selectCandidates](../functions/selectCandidates.md)). Under `caps.saveData` the set is capped to the ONE
light/floor variant, so no artifact (`srcset`, `<source>`, the preload `imagesrcset`,
CSS `image-set()`, the cache-key digest) can ever advertise a heavier candidate — the
browser cannot re-fetch what no output lists (F-RM-1a..e).

## Properties

### candidates

> `readonly` **candidates**: readonly [`ResponsiveMediaVariant`](ResponsiveMediaVariant.md)[]

Defined in: [core/src/responsive-media.ts:64](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/responsive-media.ts#L64)

The candidates safe to advertise under `caps`. Save-Data caps this to a single
light/floor variant; otherwise it is the full authored set. `srcset`, the general
`<source>`, the preload `imagesrcset`, and CSS `image-set()` all enumerate THIS.

***

### reason

> `readonly` **reason**: [`ResponsiveMediaResolutionReason`](../type-aliases/ResponsiveMediaResolutionReason.md)

Defined in: [core/src/responsive-media.ts:68](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/responsive-media.ts#L68)

Why `resolved` was chosen and how `candidates` was capped.

***

### resolved

> `readonly` **resolved**: [`ResponsiveMediaVariant`](ResponsiveMediaVariant.md)

Defined in: [core/src/responsive-media.ts:66](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/responsive-media.ts#L66)

The single best variant for `<img src>` — the DPR pick WITHIN `candidates`.
