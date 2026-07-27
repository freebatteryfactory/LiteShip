[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/reactive](../README.md) / LiveQuantizer

# Interface: LiveQuantizer\<B, O\>

Defined in: quantizer/dist/quantizer.d.ts:196

Runtime-instantiated quantizer with reactive output dispatch.

Extends the core [ReactiveQuantizer](../../schema/interfaces/ReactiveQuantizer.md) with a reactive outputs table: as
boundary crossings are detected, the outputs [CellKernel](../variables/CellKernel.md) publishes the
new per-target record, readable via `currentOutputs.read()` and observable via
`outputChanges.subscribe(sink)` (replay-1: a new subscriber is replayed the
current outputs on attach). Both views are the same underlying replay-1 kernel.

## Example

```ts
import { defineBoundary } from '@liteship/core';
import { defineQuantizer, createQuantizer } from '@liteship/quantizer';

const b = defineBoundary({
  input: 'w',
  at: [[0, 'sm'], [768, 'lg']],
});
const config = defineQuantizer(b, {
  outputs: { css: { sm: { fontSize: '14px' }, lg: { fontSize: '18px' } } },
});
const live = createQuantizer(config);
live.evaluate(900); // triggers crossing; outputs kernel publishes CSS
await live.dispose();
```

## Extends

- [`ReactiveQuantizer`](../../schema/interfaces/ReactiveQuantizer.md)\<`B`\>

## Type Parameters

### B

`B` *extends* [`Boundary`](../../type-aliases/Boundary.md)

### O

`O` *extends* `QuantizerOutputs`\<`B`\> = `QuantizerOutputs`\<`B`\>

## Properties

### \_tag

> `readonly` **\_tag**: `"Quantizer"`

Defined in: core/dist/schema/quantizer-types.d.ts:35

#### Inherited from

[`ReactiveQuantizer`](../../schema/interfaces/ReactiveQuantizer.md).[`_tag`](../../schema/interfaces/ReactiveQuantizer.md#_tag)

***

### boundary

> `readonly` **boundary**: `B`

Defined in: core/dist/schema/quantizer-types.d.ts:36

#### Inherited from

[`ReactiveQuantizer`](../../schema/interfaces/ReactiveQuantizer.md).[`boundary`](../../schema/interfaces/ReactiveQuantizer.md#boundary)

***

### changes

> `readonly` **changes**: [`QuantizerCrossings`](../../../../core/src/type-aliases/QuantizerCrossings.md)\<`B`\>

Defined in: core/dist/schema/quantizer-types.d.ts:65

No-replay crossing subscription (was `Stream.Stream<BoundaryCrossing<StateUnion<B> & string>>`).

#### Inherited from

[`ReactiveQuantizer`](../../schema/interfaces/ReactiveQuantizer.md).[`changes`](../../schema/interfaces/ReactiveQuantizer.md#changes)

***

### config

> `readonly` **config**: [`QuantizerConfig`](QuantizerConfig.md)\<`B`, `O`\>

Defined in: quantizer/dist/quantizer.d.ts:198

The config this quantizer was created from.

***

### currentOutputs

> `readonly` **currentOutputs**: `Pick`\<[`Replay`](../namespaces/CellKernel/type-aliases/Replay.md)\<`OutputRecord`\>, `"read"` \| `"subscribe"` \| `"closed"` \| `"size"`\>

Defined in: quantizer/dist/quantizer.d.ts:200

Read the currently-active per-target output record (replay-1 read side).

***

### outputChanges

> `readonly` **outputChanges**: `Pick`\<[`Replay`](../namespaces/CellKernel/type-aliases/Replay.md)\<`OutputRecord`\>, `"subscribe"` \| `"read"` \| `"closed"` \| `"size"`\>

Defined in: quantizer/dist/quantizer.d.ts:202

Per-target output records emitted on each boundary crossing (replay-1 subscribe side).

***

### state

> `readonly` **state**: [`QuantizerState`](../../schema/type-aliases/QuantizerState.md)\<`B`\>

Defined in: core/dist/schema/quantizer-types.d.ts:63

Replay-1 current-state read (was `Effect.Effect<StateUnion<B>>`).

#### Inherited from

[`ReactiveQuantizer`](../../schema/interfaces/ReactiveQuantizer.md).[`state`](../../schema/interfaces/ReactiveQuantizer.md#state)

***

### stateSync?

> `readonly` `optional` **stateSync?**: () => `StateUnion`\<`B`\>

Defined in: core/dist/schema/quantizer-types.d.ts:38

Synchronous state accessor for hot paths (avoids reactive read overhead).

#### Returns

`StateUnion`\<`B`\>

#### Inherited from

[`ReactiveQuantizer`](../../schema/interfaces/ReactiveQuantizer.md).[`stateSync`](../../schema/interfaces/ReactiveQuantizer.md#statesync)

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

[`ReactiveQuantizer`](../../schema/interfaces/ReactiveQuantizer.md).[`evaluate`](../../schema/interfaces/ReactiveQuantizer.md#evaluate)
