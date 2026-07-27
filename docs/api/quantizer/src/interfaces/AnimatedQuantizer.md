[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [quantizer/src](../README.md) / AnimatedQuantizer

# Interface: AnimatedQuantizer\<B\>

Defined in: [quantizer/src/animated-quantizer.ts:52](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/animated-quantizer.ts#L52)

Quantizer augmented with transition-aware output interpolation.

The `interpolated` no-replay [CellKernel](../../../liteship/src/reactive/variables/CellKernel.md) fan-out publishes a frame on
each animation tick containing the target state, normalized progress (0-1),
and the current lerped output record. Non-numeric values snap at the 50% mark.
Subscribe via `interpolated.subscribe(sink)`; a late subscriber never sees a
frame published before it attached.

## Extends

- [`ReactiveQuantizer`](../../../liteship/src/schema/interfaces/ReactiveQuantizer.md)\<`B`\>

## Type Parameters

### B

`B` *extends* [`Boundary`](../../../liteship/src/type-aliases/Boundary.md)

## Properties

### \_tag

> `readonly` **\_tag**: `"Quantizer"`

Defined in: core/dist/schema/quantizer-types.d.ts:35

#### Inherited from

[`ReactiveQuantizer`](../../../liteship/src/schema/interfaces/ReactiveQuantizer.md).[`_tag`](../../../liteship/src/schema/interfaces/ReactiveQuantizer.md#_tag)

***

### boundary

> `readonly` **boundary**: `B`

Defined in: core/dist/schema/quantizer-types.d.ts:36

#### Inherited from

[`ReactiveQuantizer`](../../../liteship/src/schema/interfaces/ReactiveQuantizer.md).[`boundary`](../../../liteship/src/schema/interfaces/ReactiveQuantizer.md#boundary)

***

### changes

> `readonly` **changes**: [`QuantizerCrossings`](../../../core/src/type-aliases/QuantizerCrossings.md)\<`B`\>

Defined in: core/dist/schema/quantizer-types.d.ts:65

No-replay crossing subscription (was `Stream.Stream<BoundaryCrossing<StateUnion<B> & string>>`).

#### Inherited from

[`ReactiveQuantizer`](../../../liteship/src/schema/interfaces/ReactiveQuantizer.md).[`changes`](../../../liteship/src/schema/interfaces/ReactiveQuantizer.md#changes)

***

### interpolated

> `readonly` **interpolated**: `Pick`\<[`Fanout`](../../../liteship/src/reactive/namespaces/CellKernel/type-aliases/Fanout.md)\<[`InterpolatedFrame`](InterpolatedFrame.md)\<`B`\>\>, `"subscribe"` \| `"closed"` \| `"size"`\>

Defined in: [quantizer/src/animated-quantizer.ts:56](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/animated-quantizer.ts#L56)

No-replay subscription of interpolated animation frames during crossings.

***

### state

> `readonly` **state**: [`QuantizerState`](../../../liteship/src/schema/type-aliases/QuantizerState.md)\<`B`\>

Defined in: core/dist/schema/quantizer-types.d.ts:63

Replay-1 current-state read (was `Effect.Effect<StateUnion<B>>`).

#### Inherited from

[`ReactiveQuantizer`](../../../liteship/src/schema/interfaces/ReactiveQuantizer.md).[`state`](../../../liteship/src/schema/interfaces/ReactiveQuantizer.md#state)

***

### stateSync?

> `readonly` `optional` **stateSync?**: () => `StateUnion`\<`B`\>

Defined in: core/dist/schema/quantizer-types.d.ts:38

Synchronous state accessor for hot paths (avoids reactive read overhead).

#### Returns

`StateUnion`\<`B`\>

#### Inherited from

[`ReactiveQuantizer`](../../../liteship/src/schema/interfaces/ReactiveQuantizer.md).[`stateSync`](../../../liteship/src/schema/interfaces/ReactiveQuantizer.md#statesync)

***

### transition

> `readonly` **transition**: [`Transition`](Transition.md)\<`B`\>

Defined in: [quantizer/src/animated-quantizer.ts:54](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/animated-quantizer.ts#L54)

Resolver that maps `from -> to` crossings to [TransitionConfig](TransitionConfig.md).

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

[`ReactiveQuantizer`](../../../liteship/src/schema/interfaces/ReactiveQuantizer.md).[`evaluate`](../../../liteship/src/schema/interfaces/ReactiveQuantizer.md#evaluate)
