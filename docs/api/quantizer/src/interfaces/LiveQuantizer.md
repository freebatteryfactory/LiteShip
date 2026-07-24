[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [quantizer/src](../README.md) / LiveQuantizer

# Interface: LiveQuantizer\<B, O\>

Defined in: [quantizer/src/quantizer.ts:297](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L297)

Runtime-instantiated quantizer with reactive output dispatch.

Extends the core [ReactiveQuantizer](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/quantizer-types.ts) with a reactive outputs table: as
boundary crossings are detected, the outputs [CellKernel](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/cell-kernel.ts) publishes the
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

- [`ReactiveQuantizer`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/quantizer-types.ts)\<`B`\>

## Type Parameters

### B

`B` *extends* [`Boundary`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/interfaces/Boundary.md)

### O

`O` *extends* [`QuantizerOutputs`](QuantizerOutputs.md)\<`B`\> = [`QuantizerOutputs`](QuantizerOutputs.md)\<`B`\>

## Properties

### \_tag

> `readonly` **\_tag**: `"Quantizer"`

Defined in: core/dist/schema/quantizer-types.d.ts:35

#### Inherited from

`ReactiveQuantizer._tag`

***

### boundary

> `readonly` **boundary**: `B`

Defined in: core/dist/schema/quantizer-types.d.ts:36

#### Inherited from

`ReactiveQuantizer.boundary`

***

### changes

> `readonly` **changes**: [`QuantizerCrossings`](../../../core/src/type-aliases/QuantizerCrossings.md)\<`B`\>

Defined in: core/dist/schema/quantizer-types.d.ts:65

No-replay crossing subscription (was `Stream.Stream<BoundaryCrossing<StateUnion<B> & string>>`).

#### Inherited from

`ReactiveQuantizer.changes`

***

### config

> `readonly` **config**: [`QuantizerConfig`](QuantizerConfig.md)\<`B`, `O`\>

Defined in: [quantizer/src/quantizer.ts:302](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L302)

The config this quantizer was created from.

***

### currentOutputs

> `readonly` **currentOutputs**: `Pick`\<`CellKernel.Replay`\<`OutputRecord`\>, `"read"` \| `"subscribe"` \| `"closed"` \| `"size"`\>

Defined in: [quantizer/src/quantizer.ts:304](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L304)

Read the currently-active per-target output record (replay-1 read side).

***

### outputChanges

> `readonly` **outputChanges**: `Pick`\<`CellKernel.Replay`\<`OutputRecord`\>, `"subscribe"` \| `"read"` \| `"closed"` \| `"size"`\>

Defined in: [quantizer/src/quantizer.ts:306](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L306)

Per-target output records emitted on each boundary crossing (replay-1 subscribe side).

***

### state

> `readonly` **state**: `QuantizerState`\<`B`\>

Defined in: core/dist/schema/quantizer-types.d.ts:63

Replay-1 current-state read (was `Effect.Effect<StateUnion<B>>`).

#### Inherited from

`ReactiveQuantizer.state`

***

### stateSync?

> `readonly` `optional` **stateSync?**: () => `StateUnion`\<`B`\>

Defined in: core/dist/schema/quantizer-types.d.ts:38

Synchronous state accessor for hot paths (avoids reactive read overhead).

#### Returns

`StateUnion`\<`B`\>

#### Inherited from

`ReactiveQuantizer.stateSync`

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

`ReactiveQuantizer.evaluate`
