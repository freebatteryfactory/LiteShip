[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / CapsuleContract

# Interface: CapsuleContract\<K, In, Out, R\>

Defined in: [core/src/capsule.ts:63](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/capsule.ts#L63)

The contract shape a capsule declaration must satisfy. The factory
uses this to generate tests, benches, docs, and audit receipts.

`run` is optional: when present, the harness invokes it inside generated
property tests so each declared [Invariant](Invariant.md) is checked against
real (input, output) pairs sampled from the input schema. Without `run`
the harness emits an `it.skip` honest-placeholder so vacuous tests can't
masquerade as proof.

## Extended by

- [`CapsuleDef`](CapsuleDef.md)

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

***

### attribution?

> `readonly` `optional` **attribution?**: [`AttributionDecl`](AttributionDecl.md)

Defined in: [core/src/capsule.ts:73](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/capsule.ts#L73)

***

### budgets

> `readonly` **budgets**: [`BudgetDecl`](BudgetDecl.md)

Defined in: [core/src/capsule.ts:71](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/capsule.ts#L71)

***

### capabilities

> `readonly` **capabilities**: [`CapabilityDecl`](CapabilityDecl.md)\<`R`\>

Defined in: [core/src/capsule.ts:69](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/capsule.ts#L69)

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

***

### id

> `readonly` **id**: `ContentAddress`

Defined in: [core/src/capsule.ts:65](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/capsule.ts#L65)

***

### initialState?

> `readonly` `optional` **initialState?**: `Out`

Defined in: [core/src/capsule.ts:92](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/capsule.ts#L92)

Optional initial state for `stateMachine` arms — the fold seed for
[CapsuleContract.step](#step)-driven harness tests.

***

### input

> `readonly` **input**: `Schema`\<`In`\>

Defined in: [core/src/capsule.ts:67](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/capsule.ts#L67)

***

### invariants

> `readonly` **invariants**: readonly [`Invariant`](Invariant.md)\<`In`, `Out`\>[]

Defined in: [core/src/capsule.ts:70](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/capsule.ts#L70)

***

### name

> `readonly` **name**: `string`

Defined in: [core/src/capsule.ts:66](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/capsule.ts#L66)

***

### output

> `readonly` **output**: `Schema`\<`Out`\>

Defined in: [core/src/capsule.ts:68](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/capsule.ts#L68)

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

***

### site

> `readonly` **site**: readonly [`Site`](../type-aliases/Site.md)[]

Defined in: [core/src/capsule.ts:72](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/capsule.ts#L72)

***

### step?

> `readonly` `optional` **step?**: (`state`, `event`) => `Out`

Defined in: [core/src/capsule.ts:87](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/capsule.ts#L87)

Optional state-machine step handler: folds one decoded event (`In`)
into a decoded state (`Out`). With [CapsuleContract.initialState](#initialstate)
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
