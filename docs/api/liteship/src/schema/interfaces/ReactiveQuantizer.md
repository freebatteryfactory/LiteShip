[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/schema](../README.md) / ReactiveQuantizer

# Interface: ReactiveQuantizer\<B\>

Defined in: core/dist/schema/quantizer-types.d.ts:61

Reactive quantizer — the [Quantizer](../../interfaces/Quantizer.md) base plus its reactive substrate: a
replay-1 current-state read and a no-replay crossing subscription, both on the
extracted [CellKernel](../../reactive/variables/CellKernel.md). This is the shape `@liteship/quantizer`'s live
evaluator produces; a purely-synchronous quantizer omits this extension.

## Extends

- [`Quantizer`](../../interfaces/Quantizer.md)\<`B`\>

## Extended by

- [`LiveQuantizer`](../../../../quantizer/src/interfaces/LiveQuantizer.md)
- [`AnimatedQuantizerShape`](../../../../quantizer/src/interfaces/AnimatedQuantizerShape.md)
- [`LiveQuantizer`](../../reactive/interfaces/LiveQuantizer.md)

## Type Parameters

### B

`B` *extends* [`Boundary`](../../type-aliases/Boundary.md) = [`Boundary`](../../type-aliases/Boundary.md)

## Properties

### \_tag

> `readonly` **\_tag**: `"Quantizer"`

Defined in: core/dist/schema/quantizer-types.d.ts:35

#### Inherited from

[`Quantizer`](../../interfaces/Quantizer.md).[`_tag`](../../interfaces/Quantizer.md#_tag)

***

### boundary

> `readonly` **boundary**: `B`

Defined in: core/dist/schema/quantizer-types.d.ts:36

#### Inherited from

[`Quantizer`](../../interfaces/Quantizer.md).[`boundary`](../../interfaces/Quantizer.md#boundary)

***

### changes

> `readonly` **changes**: [`QuantizerCrossings`](../../../../core/src/type-aliases/QuantizerCrossings.md)\<`B`\>

Defined in: core/dist/schema/quantizer-types.d.ts:65

No-replay crossing subscription (was `Stream.Stream<BoundaryCrossing<StateUnion<B> & string>>`).

***

### state

> `readonly` **state**: [`QuantizerState`](../type-aliases/QuantizerState.md)\<`B`\>

Defined in: core/dist/schema/quantizer-types.d.ts:63

Replay-1 current-state read (was `Effect.Effect<StateUnion<B>>`).

***

### stateSync?

> `readonly` `optional` **stateSync?**: () => `StateUnion`\<`B`\>

Defined in: core/dist/schema/quantizer-types.d.ts:38

Synchronous state accessor for hot paths (avoids reactive read overhead).

#### Returns

`StateUnion`\<`B`\>

#### Inherited from

[`Quantizer`](../../interfaces/Quantizer.md).[`stateSync`](../../interfaces/Quantizer.md#statesync)

## Methods

### evaluate()

> **evaluate**(`value`): `StateUnion`\<`B`\>

Defined in: core/dist/schema/quantizer-types.d.ts:39

#### Parameters

##### value

`number`

#### Returns

`StateUnion`\<`B`\>

#### Inherited from

[`Quantizer`](../../interfaces/Quantizer.md).[`evaluate`](../../interfaces/Quantizer.md#evaluate)
