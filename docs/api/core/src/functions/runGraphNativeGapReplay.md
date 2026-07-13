[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / runGraphNativeGapReplay

# Function: runGraphNativeGapReplay()

> **runGraphNativeGapReplay**(`options`): `Promise`\<[`GraphNativeGapReplayResult`](../interfaces/GraphNativeGapReplayResult.md)\>

Defined in: [core/src/graph-query-gap-replay.ts:250](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-query-gap-replay.ts#L250)

Full graph-native gap replay: conditional QUERY read → adopt → transition/receipt
discrete replay. Does NOT widen the SSE replay payload with a signal.

## Parameters

### options

[`GraphNativeGapReplayOptions`](../interfaces/GraphNativeGapReplayOptions.md)

## Returns

`Promise`\<[`GraphNativeGapReplayResult`](../interfaces/GraphNativeGapReplayResult.md)\>
