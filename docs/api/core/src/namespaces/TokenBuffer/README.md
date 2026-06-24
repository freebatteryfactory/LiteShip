[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [core/src](../../README.md) / TokenBuffer

# TokenBuffer

TokenBuffer — ring buffer that absorbs bursty LLM token arrival and hands
tokens out at a smooth cadence. The `push` + `drainInto` path is genuinely
zero-allocation (measured, pinned); `drain` is the allocating convenience.
Reports stall via `isStalled` and rate via an internal EMA.

## Type Aliases

- [Config](type-aliases/Config.md)
- [Shape](type-aliases/Shape.md)
