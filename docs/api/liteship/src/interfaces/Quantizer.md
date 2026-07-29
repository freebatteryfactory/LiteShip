[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [liteship/src](../README.md) / Quantizer

# Interface: Quantizer\<B\>

Defined in: core/dist/schema/quantizer-types.d.ts:34

Quantizer contract — the SYNCHRONOUS base: a [Boundary](../type-aliases/Boundary.md) definition, its
`evaluate` transition, and an optional synchronous state accessor for hot
paths. The reactive machinery (a current-state read and a crossing
subscription) is layered on by [ReactiveQuantizer](../schema/interfaces/ReactiveQuantizer.md); a consumer that only
evaluates and reads `stateSync` never touches the reactive substrate.

The concrete reactive implementation is produced by `@liteship/quantizer`'s
`createQuantizer` (a [ReactiveQuantizer](../schema/interfaces/ReactiveQuantizer.md)); consumers interact only via
these structural interfaces.

## Extended by

- [`ReactiveQuantizer`](../schema/interfaces/ReactiveQuantizer.md)

## Type Parameters

### B

`B` *extends* [`Boundary`](../type-aliases/Boundary.md) = [`Boundary`](../type-aliases/Boundary.md)

## Properties

### \_tag

> `readonly` **\_tag**: `"Quantizer"`

Defined in: core/dist/schema/quantizer-types.d.ts:35

***

### boundary

> `readonly` **boundary**: `B`

Defined in: core/dist/schema/quantizer-types.d.ts:36

***

### stateSync?

> `readonly` `optional` **stateSync?**: () => `StateUnion`\<`B`\>

Defined in: core/dist/schema/quantizer-types.d.ts:38

Synchronous state accessor for hot paths (avoids reactive read overhead).

#### Returns

`StateUnion`\<`B`\>

## Methods

### evaluate()

> **evaluate**(`value`): `StateUnion`\<`B`\>

Defined in: core/dist/schema/quantizer-types.d.ts:39

#### Parameters

##### value

`number`

#### Returns

`StateUnion`\<`B`\>
