[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / LiveQuantizer

# Interface: LiveQuantizer\<B, O\>

Defined in: [\_spine/quantizer.d.ts:94](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/quantizer.d.ts#L94)

Running quantizer that publishes state and target updates from a signal.

## Extends

- [`ReactiveQuantizer`](ReactiveQuantizer.md)\<`B`\>

## Type Parameters

### B

`B` *extends* [`Boundary`](Boundary.md)

### O

`O` *extends* [`QuantizerOutputs`](QuantizerOutputs.md)\<`B`\> = [`QuantizerOutputs`](QuantizerOutputs.md)\<`B`\>

## Properties

### \_tag

> `readonly` **\_tag**: `"Quantizer"`

Defined in: [\_spine/core.d.ts:762](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L762)

#### Inherited from

[`ReactiveQuantizer`](ReactiveQuantizer.md).[`_tag`](ReactiveQuantizer.md#_tag)

***

### boundary

> `readonly` **boundary**: `B`

Defined in: [\_spine/core.d.ts:763](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L763)

#### Inherited from

[`ReactiveQuantizer`](ReactiveQuantizer.md).[`boundary`](ReactiveQuantizer.md#boundary)

***

### changes

> `readonly` **changes**: [`QuantizerCrossings`](../type-aliases/QuantizerCrossings.md)\<`B`\>

Defined in: [\_spine/core.d.ts:796](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L796)

#### Inherited from

[`ReactiveQuantizer`](ReactiveQuantizer.md).[`changes`](ReactiveQuantizer.md#changes)

***

### config

> `readonly` **config**: [`QuantizerConfig`](QuantizerConfig.md)\<`B`, `O`\>

Defined in: [\_spine/quantizer.d.ts:98](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/quantizer.d.ts#L98)

***

### currentOutputs

> `readonly` **currentOutputs**: `Pick`\<[`Replay`](../namespaces/CellKernel/interfaces/Replay.md)\<[`OutputRecord`](../type-aliases/OutputRecord.md)\>, `"read"` \| `"subscribe"` \| `"closed"` \| `"size"`\>

Defined in: [\_spine/quantizer.d.ts:100](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/quantizer.d.ts#L100)

Read the currently-active per-target output record (replay-1 read side; was `Effect.Effect<...>`).

***

### outputChanges

> `readonly` **outputChanges**: `Pick`\<[`Replay`](../namespaces/CellKernel/interfaces/Replay.md)\<[`OutputRecord`](../type-aliases/OutputRecord.md)\>, `"subscribe"` \| `"read"` \| `"closed"` \| `"size"`\>

Defined in: [\_spine/quantizer.d.ts:102](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/quantizer.d.ts#L102)

Per-target output records emitted on each crossing (replay-1 subscribe side; was `Stream.Stream<...>`).

***

### state

> `readonly` **state**: [`QuantizerState`](../type-aliases/QuantizerState.md)\<`B`\>

Defined in: [\_spine/core.d.ts:795](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L795)

#### Inherited from

[`ReactiveQuantizer`](ReactiveQuantizer.md).[`state`](ReactiveQuantizer.md#state)

***

### stateSync?

> `readonly` `optional` **stateSync?**: () => [`StateUnion`](../type-aliases/StateUnion.md)\<`B`\>

Defined in: [\_spine/core.d.ts:765](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L765)

Synchronous state accessor for hot paths (avoids reactive read overhead).

#### Returns

[`StateUnion`](../type-aliases/StateUnion.md)\<`B`\>

#### Inherited from

[`ReactiveQuantizer`](ReactiveQuantizer.md).[`stateSync`](ReactiveQuantizer.md#statesync)

## Methods

### evaluate()

> **evaluate**(`value`): [`StateUnion`](../type-aliases/StateUnion.md)\<`B`\>

Defined in: [\_spine/core.d.ts:766](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L766)

#### Parameters

##### value

`number`

#### Returns

[`StateUnion`](../type-aliases/StateUnion.md)\<`B`\>

#### Inherited from

[`ReactiveQuantizer`](ReactiveQuantizer.md).[`evaluate`](ReactiveQuantizer.md#evaluate)
