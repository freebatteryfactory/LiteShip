[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/reactive](../README.md) / Derived

# Variable: Derived

> `const` **Derived**: `object`

Defined in: core/dist/reactive/derived.d.ts:92

Derived — read-only reactive view computed from upstream sources, on
[CellKernel.replay1](CellKernel.md#replay1). Recomputes lazily on any source change and
republishes to its own subscribers; compose via the standalone [computed](computed.md)
(factory + triggers) or [Derived.combine](#combine) (tuple of readable sources).

## Type Declaration

### combine

> **combine**: *typeof* `_combine`

Combine readable sources into a single derived value of their combiner.
