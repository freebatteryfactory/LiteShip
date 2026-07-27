[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / AnimatedQuantizer

# Interface: AnimatedQuantizer\<B\>

Defined in: [\_spine/quantizer.d.ts:186](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/quantizer.d.ts#L186)

Reactive quantizer extended with transition progress and interruption semantics.

## Extends

- [`ReactiveQuantizer`](ReactiveQuantizer.md)\<`B`\>

## Type Parameters

### B

`B` *extends* [`Boundary`](Boundary.md)

## Properties

### \_tag

> `readonly` **\_tag**: `"Quantizer"`

Defined in: [\_spine/core.d.ts:977](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L977)

#### Inherited from

[`ReactiveQuantizer`](ReactiveQuantizer.md).[`_tag`](ReactiveQuantizer.md#_tag)

***

### boundary

> `readonly` **boundary**: `B`

Defined in: [\_spine/core.d.ts:978](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L978)

#### Inherited from

[`ReactiveQuantizer`](ReactiveQuantizer.md).[`boundary`](ReactiveQuantizer.md#boundary)

***

### changes

> `readonly` **changes**: [`QuantizerCrossings`](../type-aliases/QuantizerCrossings.md)\<`B`\>

Defined in: [\_spine/core.d.ts:1011](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1011)

#### Inherited from

[`ReactiveQuantizer`](ReactiveQuantizer.md).[`changes`](ReactiveQuantizer.md#changes)

***

### interpolated

> `readonly` **interpolated**: `Pick`\<[`Fanout`](../namespaces/CellKernel/interfaces/Fanout.md)\<[`InterpolatedFrame`](InterpolatedFrame.md)\<`B`\>\>, `"subscribe"` \| `"closed"` \| `"size"`\>

Defined in: [\_spine/quantizer.d.ts:193](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/quantizer.d.ts#L193)

No-replay subscription of interpolated animation frames during crossings (was
`Stream.Stream<{ state; progress; outputs }>`): a late subscriber never sees a
prior frame.

***

### state

> `readonly` **state**: [`QuantizerState`](../type-aliases/QuantizerState.md)\<`B`\>

Defined in: [\_spine/core.d.ts:1010](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1010)

#### Inherited from

[`ReactiveQuantizer`](ReactiveQuantizer.md).[`state`](ReactiveQuantizer.md#state)

***

### stateSync?

> `readonly` `optional` **stateSync?**: () => [`StateUnion`](../type-aliases/StateUnion.md)\<`B`\>

Defined in: [\_spine/core.d.ts:980](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L980)

Synchronous state accessor for hot paths (avoids reactive read overhead).

#### Returns

[`StateUnion`](../type-aliases/StateUnion.md)\<`B`\>

#### Inherited from

[`ReactiveQuantizer`](ReactiveQuantizer.md).[`stateSync`](ReactiveQuantizer.md#statesync)

***

### transition

> `readonly` **transition**: [`Transition`](../type-aliases/Transition.md)\<`B`\>

Defined in: [\_spine/quantizer.d.ts:187](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/quantizer.d.ts#L187)

## Methods

### evaluate()

> **evaluate**(`value`): [`StateUnion`](../type-aliases/StateUnion.md)\<`B`\>

Defined in: [\_spine/core.d.ts:981](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L981)

#### Parameters

##### value

`number`

#### Returns

[`StateUnion`](../type-aliases/StateUnion.md)\<`B`\>

#### Inherited from

[`ReactiveQuantizer`](ReactiveQuantizer.md).[`evaluate`](ReactiveQuantizer.md#evaluate)
