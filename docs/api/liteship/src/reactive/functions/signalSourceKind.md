[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/reactive](../README.md) / signalSourceKind

# Function: signalSourceKind()

> **signalSourceKind**(`source`): [`StateCellKind`](../type-aliases/StateCellKind.md)

Defined in: core/dist/reactive/stream-recovery.d.ts:24

Classify a canonical [SignalSource](../type-aliases/SignalSource.md) by the discrete/continuous replay law
(ROADMAP Epic 9): discrete crossings replay, continuous transients never do.

## Parameters

### source

[`SignalSource`](../type-aliases/SignalSource.md)

## Returns

[`StateCellKind`](../type-aliases/StateCellKind.md)
