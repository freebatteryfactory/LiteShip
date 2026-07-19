[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / selectCandidates

# Function: selectCandidates()

> **selectCandidates**(`intent`, `caps`): [`ResponsiveMediaCandidateSet`](../interfaces/ResponsiveMediaCandidateSet.md)

Defined in: [core/src/media/responsive-media.ts:202](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/media/responsive-media.ts#L202)

THE one effective-candidate law — the single function every responsive-media
output consumes (#140). Returns the [ResponsiveMediaCandidateSet](../interfaces/ResponsiveMediaCandidateSet.md): the
candidates safe to advertise under `caps`, the single best `src`, and the reason.

Save-Data wins over DPR and caps ALL candidates to the floor: the authored
`saveDataVariant` when present (`save-data`), else the LIGHTEST available variant
(`save-data-floor`) — a Save-Data client must never be advertised a heavier
candidate through ANY artifact, even when the author skipped the explicit light
variant. Otherwise the full authored set is advertised and `resolved` is the DPR
pick: the variant whose DPR is closest without going under the device ratio
(`dpr-match`), else the largest available (`dpr-floor`), else the first (`fallback`).

## Parameters

### intent

[`ResponsiveMediaIntent`](../interfaces/ResponsiveMediaIntent.md)

### caps

[`ResponsiveMediaCapabilities`](../interfaces/ResponsiveMediaCapabilities.md)

## Returns

[`ResponsiveMediaCandidateSet`](../interfaces/ResponsiveMediaCandidateSet.md)
