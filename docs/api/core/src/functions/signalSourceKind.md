[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [core/src](../README.md) / signalSourceKind

# Function: signalSourceKind()

> **signalSourceKind**(`source`): [`StateCellKind`](../type-aliases/StateCellKind.md)

Defined in: [core/src/reactive/stream-recovery.ts:28](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/stream-recovery.ts#L28)

Classify a canonical [SignalSource](../type-aliases/SignalSource.md) by the discrete/continuous replay law
(ROADMAP Epic 9): discrete crossings replay, continuous transients never do.

## Parameters

### source

[`SignalSource`](../type-aliases/SignalSource.md)

## Returns

[`StateCellKind`](../type-aliases/StateCellKind.md)
