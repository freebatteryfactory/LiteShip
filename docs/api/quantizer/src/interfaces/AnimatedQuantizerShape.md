[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [quantizer/src](../README.md) / AnimatedQuantizerShape

# Interface: AnimatedQuantizerShape\<B\>

Defined in: [quantizer/src/animated-quantizer.ts:25](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/animated-quantizer.ts#L25)

Quantizer augmented with transition-aware output interpolation.

The `interpolated` stream emits a frame on each animation tick containing
the target state, normalized progress (0-1), and the current lerped
output record. Non-numeric values snap at the 50% mark.

## Extends

- [`Quantizer`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/interfaces/Quantizer.md)\<`B`\>

## Type Parameters

### B

`B` *extends* [`Boundary.Shape`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/namespaces/Boundary/type-aliases/Shape.md)

## Properties

### \_tag

> `readonly` **\_tag**: `"Quantizer"`

Defined in: core/dist/quantizer-types.d.ts:20

#### Inherited from

`Quantizer._tag`

***

### boundary

> `readonly` **boundary**: `B`

Defined in: core/dist/quantizer-types.d.ts:21

#### Inherited from

`Quantizer.boundary`

***

### changes

> `readonly` **changes**: `Stream`\<`BoundaryCrossing`\<`StateUnion`\<`B`\>\>\>

Defined in: core/dist/quantizer-types.d.ts:25

#### Inherited from

`Quantizer.changes`

***

### interpolated

> `readonly` **interpolated**: `Stream`\<\{ `outputs`: `Record`\<`string`, `number` \| `string`\>; `progress`: `number`; `state`: `StateUnion`\<`B`\>; \}\>

Defined in: [quantizer/src/animated-quantizer.ts:29](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/animated-quantizer.ts#L29)

Stream of interpolated animation frames during crossings.

***

### state

> `readonly` **state**: `Effect`\<`StateUnion`\<`B`\>\>

Defined in: core/dist/quantizer-types.d.ts:22

#### Inherited from

`Quantizer.state`

***

### stateSync?

> `readonly` `optional` **stateSync?**: () => `StateUnion`\<`B`\>

Defined in: core/dist/quantizer-types.d.ts:24

Synchronous state accessor for hot paths (avoids Effect overhead).

#### Returns

`StateUnion`\<`B`\>

#### Inherited from

`Quantizer.stateSync`

***

### transition

> `readonly` **transition**: [`Transition`](Transition.md)\<`B`\>

Defined in: [quantizer/src/animated-quantizer.ts:27](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/animated-quantizer.ts#L27)

Resolver that maps `from -> to` crossings to [TransitionConfig](TransitionConfig.md).

## Methods

### evaluate()

> **evaluate**(`value`): `StateUnion`\<`B`\>

Defined in: core/dist/quantizer-types.d.ts:26

#### Parameters

##### value

`number`

#### Returns

`StateUnion`\<`B`\>

#### Inherited from

`Quantizer.evaluate`
