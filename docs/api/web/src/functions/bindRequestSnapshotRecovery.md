[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / bindRequestSnapshotRecovery

# Function: bindRequestSnapshotRecovery()

> **bindRequestSnapshotRecovery**(`target`, `options`): () => `void`

Defined in: [web/src/stream/recovery.ts:242](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery.ts#L242)

Wire the production listener for `czap:request-snapshot` (morph rejection recovery).
Returns a disposer for teardown.

## Parameters

### target

`EventTarget`

### options

[`StreamRecoveryOptions`](../interfaces/StreamRecoveryOptions.md)

## Returns

() => `void`
