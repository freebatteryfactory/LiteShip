[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [web/src](../README.md) / bindRequestSnapshotRecovery

# Function: bindRequestSnapshotRecovery()

> **bindRequestSnapshotRecovery**(`target`, `options`): () => `void`

Defined in: [web/src/stream/recovery.ts:250](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery.ts#L250)

Wire the production listener for `liteship:request-snapshot` (morph rejection recovery).
Returns a disposer for teardown.

## Parameters

### target

`EventTarget`

### options

[`StreamRecoveryOptions`](../interfaces/StreamRecoveryOptions.md)

## Returns

() => `void`
