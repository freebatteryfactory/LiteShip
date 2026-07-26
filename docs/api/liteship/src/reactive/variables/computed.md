[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/reactive](../README.md) / computed

# Variable: computed

> `const` **computed**: \<`T`\>(`compute`, `sources?`) => `DerivedShape`\<`T`\> & [`AsyncOwnedResource`](../interfaces/AsyncOwnedResource.md)

Defined in: core/dist/reactive/derived.d.ts:79

Compute a derived value from a `compute` factory and the sources whose
emissions recompute it. With no sources it is static (never recomputes).

## Type Parameters

### T

`T`

## Parameters

### compute

() => `T`

### sources?

`ReadonlyArray`\<`DerivedTrigger`\>

## Returns

`DerivedShape`\<`T`\> & [`AsyncOwnedResource`](../interfaces/AsyncOwnedResource.md)
