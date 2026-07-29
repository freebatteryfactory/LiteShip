[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [\_spine](../../README.md) / CellKernel

# CellKernel

CellKernel — the shared replay-current / fan-out reactive substrate extracted
from the compositor's notification seam. `replay1` replays the current value on
subscribe (Compositor.changes / Cell); `fanout` is the strictly-simpler no-replay
channel (Zap / crossings / BlendTree.changes).

## Interfaces

- [Fanout](interfaces/Fanout.md)
- [Replay](interfaces/Replay.md)
- [Sink](interfaces/Sink.md)

## Type Aliases

- [Disposer](type-aliases/Disposer.md)
- [Subscriber](type-aliases/Subscriber.md)

## Functions

- [fanout](functions/fanout.md)
- [replay1](functions/replay1.md)
