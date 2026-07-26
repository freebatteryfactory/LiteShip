[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/runtime](../README.md) / bindRequestSnapshotRecovery

# Variable: bindRequestSnapshotRecovery

> `const` **bindRequestSnapshotRecovery**: (`target`, `options`) => () => `void`

Defined in: web/dist/stream/recovery.d.ts:100

Wire the production listener for `liteship:request-snapshot` (morph rejection recovery).
Returns a disposer for teardown.

## Parameters

### target

`EventTarget`

### options

[`StreamRecoveryOptions`](../interfaces/StreamRecoveryOptions.md)

## Returns

() => `void`
