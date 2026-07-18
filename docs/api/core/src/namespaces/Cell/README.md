[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [core/src](../../README.md) / Cell

# Cell

Cell — mutable reactive primitive backed by [CellKernel](../../variables/CellKernel.md). `read` for a
snapshot, `set`/`update` to push, `subscribe` for the replay-1 stream of
values (current replayed on attach). Effect-free — the transport swap that lets
consumers coordinate ordinary state with no `effect` import (#153).

## Type Aliases

- [Shape](type-aliases/Shape.md)
