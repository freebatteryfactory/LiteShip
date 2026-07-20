[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [quantizer/src](../README.md) / AnimatedQuantizerShape

# Interface: AnimatedQuantizerShape\<B\>

Defined in: [quantizer/src/animated-quantizer.ts:43](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/animated-quantizer.ts#L43)

Quantizer augmented with transition-aware output interpolation.

The `interpolated` no-replay [CellKernel](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/cell-kernel.ts) fan-out publishes a frame on
each animation tick containing the target state, normalized progress (0-1),
and the current lerped output record. Non-numeric values snap at the 50% mark.
Subscribe via `interpolated.subscribe(sink)`; a late subscriber never sees a
frame published before it attached.

## Extends

- [`ReactiveQuantizer`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/quantizer-types.ts)\<`B`\>

## Type Parameters

### B

`B` *extends* [`Boundary`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/interfaces/Boundary.md)

## Properties

### \_tag

> `readonly` **\_tag**: `"Quantizer"`

Defined in: core/dist/schema/quantizer-types.d.ts:33

#### Inherited from

`ReactiveQuantizer._tag`

***

### boundary

> `readonly` **boundary**: `B`

Defined in: core/dist/schema/quantizer-types.d.ts:34

#### Inherited from

`ReactiveQuantizer.boundary`

***

### changes

> `readonly` **changes**: [`QuantizerCrossings`](../../../core/src/type-aliases/QuantizerCrossings.md)\<`B`\>

Defined in: core/dist/schema/quantizer-types.d.ts:63

No-replay crossing subscription (was `Stream.Stream<BoundaryCrossing<StateUnion<B> & string>>`).

#### Inherited from

`ReactiveQuantizer.changes`

***

### interpolated

> `readonly` **interpolated**: `Pick`\<`CellKernel.Fanout`\<[`InterpolatedFrame`](InterpolatedFrame.md)\<`B`\>\>, `"subscribe"` \| `"closed"` \| `"size"`\>

Defined in: [quantizer/src/animated-quantizer.ts:47](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/animated-quantizer.ts#L47)

No-replay subscription of interpolated animation frames during crossings.

***

### state

> `readonly` **state**: `QuantizerState`\<`B`\>

Defined in: core/dist/schema/quantizer-types.d.ts:61

Replay-1 current-state read (was `Effect.Effect<StateUnion<B>>`).

#### Inherited from

`ReactiveQuantizer.state`

***

### stateSync?

> `readonly` `optional` **stateSync?**: () => `StateUnion`\<`B`\>

Defined in: core/dist/schema/quantizer-types.d.ts:36

Synchronous state accessor for hot paths (avoids reactive read overhead).

#### Returns

`StateUnion`\<`B`\>

#### Inherited from

`ReactiveQuantizer.stateSync`

***

### transition

> `readonly` **transition**: [`Transition`](Transition.md)\<`B`\>

Defined in: [quantizer/src/animated-quantizer.ts:45](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/animated-quantizer.ts#L45)

Resolver that maps `from -> to` crossings to [TransitionConfig](TransitionConfig.md).

## Methods

### evaluate()

> **evaluate**(`value`): `StateUnion`\<`B`\>

Defined in: core/dist/schema/quantizer-types.d.ts:37

#### Parameters

##### value

`number`

#### Returns

`StateUnion`\<`B`\>

#### Inherited from

`ReactiveQuantizer.evaluate`
