[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / Derived

# Variable: Derived

> `const` **Derived**: `object`

Defined in: [core/src/reactive/derived.ts:187](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/derived.ts#L187)

Derived — read-only reactive view computed from upstream sources, on
[CellKernel.replay1](CellKernel.md#replay1). Recomputes lazily on any source change and
republishes to its own subscribers; compose via the standalone [computed](../functions/computed.md)
(factory + triggers) or [Derived.combine](#combine) (tuple of readable sources).

## Type Declaration

### combine

> **combine**: \<`T`, `U`\>(`sources`, `combiner`) => `DerivedShape`\<`U`\> = `_combine`

Combine readable sources into a single derived value of their combiner.

Combine multiple sources into a single derived value of `combiner(...values)`.
Recomputes from a CONSISTENT snapshot of every source on each change (no torn
reads): the recompute reads all current source values at that instant.

#### Type Parameters

##### T

`T` *extends* readonly `unknown`[]

##### U

`U`

#### Parameters

##### sources

\{ readonly \[K in string \| number \| symbol\]: DerivedSource\<T\[K\]\> \}

##### combiner

(...`args`) => `U`

#### Returns

`DerivedShape`\<`U`\>
