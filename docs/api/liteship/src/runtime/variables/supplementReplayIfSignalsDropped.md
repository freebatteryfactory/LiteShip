[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/runtime](../README.md) / supplementReplayIfSignalsDropped

# Variable: supplementReplayIfSignalsDropped

> `const` **supplementReplayIfSignalsDropped**: (`patches`, `options`) => `Promise`\<`void`\>

Defined in: web/dist/stream/recovery.d.ts:102

After HTML gap replay, supplement missed discrete crossings via snapshot re-sync
when the replay payload dropped non-HTML signal frames.

## Parameters

### patches

readonly `unknown`[]

### options

[`StreamRecoveryOptions`](../interfaces/StreamRecoveryOptions.md)

## Returns

`Promise`\<`void`\>
