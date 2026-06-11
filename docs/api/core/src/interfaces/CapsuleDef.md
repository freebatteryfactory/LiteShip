[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / CapsuleDef

# Interface: CapsuleDef\<K, In, Out, R\>

Defined in: [core/src/assembly.ts:16](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/assembly.ts#L16)

A capsule declaration plus its content-addressed id.

## Extends

- [`CapsuleContract`](CapsuleContract.md)\<`K`, `In`, `Out`, `R`\>

## Type Parameters

### K

`K` *extends* [`AssemblyKind`](../type-aliases/AssemblyKind.md)

### In

`In`

### Out

`Out`

### R

`R`

## Properties

### \_kind

> `readonly` **\_kind**: `K`

Defined in: [core/src/capsule.ts:64](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/capsule.ts#L64)

#### Inherited from

[`CapsuleContract`](CapsuleContract.md).[`_kind`](CapsuleContract.md#_kind)

***

### attribution?

> `readonly` `optional` **attribution?**: [`AttributionDecl`](AttributionDecl.md)

Defined in: [core/src/capsule.ts:73](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/capsule.ts#L73)

#### Inherited from

[`CapsuleContract`](CapsuleContract.md).[`attribution`](CapsuleContract.md#attribution)

***

### budgets

> `readonly` **budgets**: [`BudgetDecl`](BudgetDecl.md)

Defined in: [core/src/capsule.ts:71](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/capsule.ts#L71)

#### Inherited from

[`CapsuleContract`](CapsuleContract.md).[`budgets`](CapsuleContract.md#budgets)

***

### capabilities

> `readonly` **capabilities**: [`CapabilityDecl`](CapabilityDecl.md)\<`R`\>

Defined in: [core/src/capsule.ts:69](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/capsule.ts#L69)

#### Inherited from

[`CapsuleContract`](CapsuleContract.md).[`capabilities`](CapsuleContract.md#capabilities)

***

### derive?

> `readonly` `optional` **derive?**: (`source`) => `Out` \| `Promise`\<`Out`\>

Defined in: [core/src/capsule.ts:101](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/capsule.ts#L101)

Optional projection handler for `cachedProjection` arms: derives the
decoded output from a decoded source. The harness checks determinism
(same source → deep-equal output) and every declared [Invariant](Invariant.md)
under random sources. May be async — asset decoders
(`AssetDecl.decoder` and the `@czap/assets` built-ins) all return
Promises, so the harness awaits every probe.

#### Parameters

##### source

`In`

#### Returns

`Out` \| `Promise`\<`Out`\>

#### Inherited from

[`CapsuleContract`](CapsuleContract.md).[`derive`](CapsuleContract.md#derive)

***

### id

> `readonly` **id**: `ContentAddress`

Defined in: [core/src/assembly.ts:17](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/assembly.ts#L17)

#### Overrides

[`CapsuleContract`](CapsuleContract.md).[`id`](CapsuleContract.md#id)

***

### initialState?

> `readonly` `optional` **initialState?**: `Out`

Defined in: [core/src/capsule.ts:92](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/capsule.ts#L92)

Optional initial state for `stateMachine` arms — the fold seed for
[CapsuleContract.step](CapsuleContract.md#step)-driven harness tests.

#### Inherited from

[`CapsuleContract`](CapsuleContract.md).[`initialState`](CapsuleContract.md#initialstate)

***

### input

> `readonly` **input**: `Schema`\<`In`\>

Defined in: [core/src/capsule.ts:67](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/capsule.ts#L67)

#### Inherited from

[`CapsuleContract`](CapsuleContract.md).[`input`](CapsuleContract.md#input)

***

### invariants

> `readonly` **invariants**: readonly [`Invariant`](Invariant.md)\<`In`, `Out`\>[]

Defined in: [core/src/capsule.ts:70](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/capsule.ts#L70)

#### Inherited from

[`CapsuleContract`](CapsuleContract.md).[`invariants`](CapsuleContract.md#invariants)

***

### name

> `readonly` **name**: `string`

Defined in: [core/src/capsule.ts:66](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/capsule.ts#L66)

#### Inherited from

[`CapsuleContract`](CapsuleContract.md).[`name`](CapsuleContract.md#name)

***

### output

> `readonly` **output**: `Schema`\<`Out`\>

Defined in: [core/src/capsule.ts:68](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/capsule.ts#L68)

#### Inherited from

[`CapsuleContract`](CapsuleContract.md).[`output`](CapsuleContract.md#output)

***

### run?

> `readonly` `optional` **run?**: (`input`) => `Out`

Defined in: [core/src/capsule.ts:79](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/capsule.ts#L79)

Optional pure-transform handler: takes a decoded input and returns a
decoded output. Used by the harness to drive generated property tests
end-to-end. Only meaningful for `pureTransform` arms today.

#### Parameters

##### input

`In`

#### Returns

`Out`

#### Inherited from

[`CapsuleContract`](CapsuleContract.md).[`run`](CapsuleContract.md#run)

***

### site

> `readonly` **site**: readonly [`Site`](../type-aliases/Site.md)[]

Defined in: [core/src/capsule.ts:72](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/capsule.ts#L72)

#### Inherited from

[`CapsuleContract`](CapsuleContract.md).[`site`](CapsuleContract.md#site)

***

### step?

> `readonly` `optional` **step?**: (`state`, `event`) => `Out`

Defined in: [core/src/capsule.ts:87](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/capsule.ts#L87)

Optional state-machine step handler: folds one decoded event (`In`)
into a decoded state (`Out`). With [CapsuleContract.initialState](CapsuleContract.md#initialstate)
present, the harness drives randomized event sequences and checks every
declared [Invariant](Invariant.md) after each step, plus deterministic replay.
Only meaningful for `stateMachine` arms.

#### Parameters

##### state

`Out`

##### event

`In`

#### Returns

`Out`

#### Inherited from

[`CapsuleContract`](CapsuleContract.md).[`step`](CapsuleContract.md#step)
