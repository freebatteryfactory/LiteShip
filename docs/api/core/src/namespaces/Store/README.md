[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [core/src](../../README.md) / Store

# Store

Store — TEA-style state container over [CellKernel.replay1](../../variables/CellKernel.md#replay1). Build with an
initial state and a pure `reducer(state, msg) => state`, then dispatch messages;
the store publishes each resulting state through `subscribe`, and
`lifetime.dispose()` tears it down.

## Type Aliases

- [Shape](type-aliases/Shape.md)
