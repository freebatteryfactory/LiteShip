[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / Derived

# Variable: Derived

> `const` **Derived**: `object`

Defined in: [core/src/derived.ts:150](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/derived.ts#L150)

Derived — read-only reactive view computed from upstream [Cell](Cell.md)s.
A `Derived` recomputes lazily and pushes the new value into its own stream
when any dependency changes; composes via `combine`, `map`, and `flatten`.

## Type Declaration

### combine

> **combine**: \<`T`, `U`\>(`cells`, `combiner`) => `Effect`\<`DerivedShape`\<`U`\>, `never`, [`Scope`](https://effect-ts.github.io/effect/effect/Scope.ts.html)\> = `_combine`

Combine multiple cells into a single derived cell of their tuple.

#### Type Parameters

##### T

`T` *extends* readonly `unknown`[]

##### U

`U`

#### Parameters

##### cells

\{ \[K in string \| number \| symbol\]: Shape\<T\[K\]\> \}

##### combiner

(...`args`) => `U`

#### Returns

`Effect`\<`DerivedShape`\<`U`\>, `never`, [`Scope`](https://effect-ts.github.io/effect/effect/Scope.ts.html)\>

### flatten

> **flatten**: \<`T`\>(`nested`) => `Effect`\<`DerivedShape`\<`T`\>, `never`, [`Scope`](https://effect-ts.github.io/effect/effect/Scope.ts.html)\> = `_flatten`

Flatten a derived-of-derived into a single derived of the inner value.

#### Type Parameters

##### T

`T`

#### Parameters

##### nested

`DerivedShape`\<`DerivedShape`\<`T`\>\>

#### Returns

`Effect`\<`DerivedShape`\<`T`\>, `never`, [`Scope`](https://effect-ts.github.io/effect/effect/Scope.ts.html)\>

### make

> **make**: \<`T`\>(`compute`, `sources`) => `Effect`\<`DerivedShape`\<`T`\>, `never`, [`Scope`](https://effect-ts.github.io/effect/effect/Scope.ts.html)\> = `_make`

Build a derived cell from a factory computing against upstream sources.

#### Type Parameters

##### T

`T`

#### Parameters

##### compute

`Effect`\<`T`\>

##### sources?

readonly `Stream`\<`unknown`, `never`, `never`\>[] = `[]`

#### Returns

`Effect`\<`DerivedShape`\<`T`\>, `never`, [`Scope`](https://effect-ts.github.io/effect/effect/Scope.ts.html)\>

### map

> **map**: \<`A`, `B`\>(`derived`, `f`) => `Effect`\<`DerivedShape`\<`B`\>, `never`, [`Scope`](https://effect-ts.github.io/effect/effect/Scope.ts.html)\> = `_map`

Pure projection of an existing cell/derived.

#### Type Parameters

##### A

`A`

##### B

`B`

#### Parameters

##### derived

`DerivedShape`\<`A`\>

##### f

(`a`) => `B`

#### Returns

`Effect`\<`DerivedShape`\<`B`\>, `never`, [`Scope`](https://effect-ts.github.io/effect/effect/Scope.ts.html)\>
