[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / supplementReplayIfSignalsDropped

# Function: supplementReplayIfSignalsDropped()

> **supplementReplayIfSignalsDropped**(`patches`, `options`): `Promise`\<`void`\>

Defined in: [web/src/stream/recovery.ts:218](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery.ts#L218)

After HTML gap replay, supplement missed discrete crossings via snapshot re-sync
when the replay payload dropped non-HTML signal frames.

## Parameters

### patches

readonly `unknown`[]

### options

[`StreamRecoveryOptions`](../interfaces/StreamRecoveryOptions.md)

## Returns

`Promise`\<`void`\>
