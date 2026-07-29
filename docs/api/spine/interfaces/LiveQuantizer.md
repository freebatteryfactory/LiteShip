[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / LiveQuantizer

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

Defined in: [\_spine/core.d.ts:978](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L978)

#### Inherited from

[`ReactiveQuantizer`](ReactiveQuantizer.md).[`_tag`](ReactiveQuantizer.md#_tag)

***

### boundary

> `readonly` **boundary**: `B`

Defined in: [\_spine/core.d.ts:979](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L979)

#### Inherited from

[`ReactiveQuantizer`](ReactiveQuantizer.md).[`boundary`](ReactiveQuantizer.md#boundary)

***

### changes

> `readonly` **changes**: [`QuantizerCrossings`](../type-aliases/QuantizerCrossings.md)\<`B`\>

Defined in: [\_spine/core.d.ts:1012](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1012)

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

Defined in: [\_spine/core.d.ts:1011](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1011)

#### Inherited from

[`ReactiveQuantizer`](ReactiveQuantizer.md).[`state`](ReactiveQuantizer.md#state)

***

### stateSync?

> `readonly` `optional` **stateSync?**: () => [`StateUnion`](../type-aliases/StateUnion.md)\<`B`\>

Defined in: [\_spine/core.d.ts:981](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L981)

Synchronous state accessor for hot paths (avoids reactive read overhead).

#### Returns

[`StateUnion`](../type-aliases/StateUnion.md)\<`B`\>

#### Inherited from

[`ReactiveQuantizer`](ReactiveQuantizer.md).[`stateSync`](ReactiveQuantizer.md#statesync)

## Methods

### evaluate()

> **evaluate**(`value`): [`StateUnion`](../type-aliases/StateUnion.md)\<`B`\>

Defined in: [\_spine/core.d.ts:982](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L982)

#### Parameters

##### value

`number`

#### Returns

[`StateUnion`](../type-aliases/StateUnion.md)\<`B`\>

#### Inherited from

[`ReactiveQuantizer`](ReactiveQuantizer.md).[`evaluate`](ReactiveQuantizer.md#evaluate)
