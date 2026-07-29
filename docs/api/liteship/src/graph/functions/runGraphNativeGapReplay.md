[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/graph](../README.md) / runGraphNativeGapReplay

# Function: runGraphNativeGapReplay()

> **runGraphNativeGapReplay**(`options`): `Promise`\<[`GraphNativeGapReplayResult`](../interfaces/GraphNativeGapReplayResult.md)\>

Defined in: core/dist/graph/graph-query-gap-replay.d.ts:86

Full graph-native gap replay: conditional QUERY read → adopt → transition/receipt
discrete replay. Does NOT widen the SSE replay payload with a signal.

## Parameters

### options

[`GraphNativeGapReplayOptions`](../interfaces/GraphNativeGapReplayOptions.md)

## Returns

`Promise`\<[`GraphNativeGapReplayResult`](../interfaces/GraphNativeGapReplayResult.md)\>
