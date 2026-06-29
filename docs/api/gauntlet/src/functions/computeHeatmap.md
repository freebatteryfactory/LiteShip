[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / computeHeatmap

# Function: computeHeatmap()

> **computeHeatmap**(`inputs`): [`AmbitionProofHeatmap`](../interfaces/AmbitionProofHeatmap.md)

Defined in: [gauntlet/src/ambition-proof.ts:214](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/ambition-proof.ts#L214)

Compute the ambition÷proof heatmap — the ONE pure, deterministic fold. Ranks every
substantive module hottest-first; the same inputs fold to a byte-identical artifact.

The blend is two passes: (1) gather each module's RAW signals (size, symbol count,
claim hits, assurance rank, call-sites, the host proof booleans + mutation score),
(2) NORMALIZE the corpus-relative signals against their corpus maxima and blend each
module's AMBITION + PROOF means, then the hotness ratio. Two passes because the
normalization needs the corpus maxima, which are known only after the first pass —
a pure, total fold, no I/O, no clock.

## Parameters

### inputs

[`HeatmapInputs`](../interfaces/HeatmapInputs.md)

## Returns

[`AmbitionProofHeatmap`](../interfaces/AmbitionProofHeatmap.md)
