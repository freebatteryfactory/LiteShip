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

Defined in: [core/src/capsule.ts:95](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/capsule.ts#L95)

#### Inherited from

[`CapsuleContract`](CapsuleContract.md).[`_kind`](CapsuleContract.md#_kind)

***

### attribution?

> `readonly` `optional` **attribution?**: [`AttributionDecl`](AttributionDecl.md)

Defined in: [core/src/capsule.ts:104](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/capsule.ts#L104)

#### Inherited from

[`CapsuleContract`](CapsuleContract.md).[`attribution`](CapsuleContract.md#attribution)

***

### budgets

> `readonly` **budgets**: [`BudgetDecl`](BudgetDecl.md)

Defined in: [core/src/capsule.ts:102](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/capsule.ts#L102)

#### Inherited from

[`CapsuleContract`](CapsuleContract.md).[`budgets`](CapsuleContract.md#budgets)

***

### capabilities

> `readonly` **capabilities**: [`CapabilityDecl`](CapabilityDecl.md)\<`R`\>

Defined in: [core/src/capsule.ts:100](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/capsule.ts#L100)

#### Inherited from

[`CapsuleContract`](CapsuleContract.md).[`capabilities`](CapsuleContract.md#capabilities)

***

### derive?

> `readonly` `optional` **derive?**: (`source`) => `Out` \| `Promise`\<`Out`\>

Defined in: [core/src/capsule.ts:132](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/capsule.ts#L132)

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

### faults?

> `readonly` `optional` **faults?**: readonly `FaultDecl`\<`In`\>[]

Defined in: [core/src/capsule.ts:162](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/capsule.ts#L162)

Declared faults for `receiptedMutation` arms — failure modes the capsule
promises are reachable. The harness drives each fault's
FaultDecl.trigger through [CapsuleContract.mutate](CapsuleContract.md#mutate) and
asserts it surfaces as declared. Requires `mutate`. Under the mandatory
`mutate` requirement (see the kind-level rule below) every receipted
mutation with a pure core declares at least one fault — a capsule with a
genuinely fault-free core may declare an empty table, in which case the
fault-injection check is non-emitted (nothing to prove reachable). Only
meaningful for `receiptedMutation` arms.

#### Inherited from

[`CapsuleContract`](CapsuleContract.md).[`faults`](CapsuleContract.md#faults)

***

### id

> `readonly` **id**: `ContentAddress`

Defined in: [core/src/assembly.ts:17](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/assembly.ts#L17)

#### Overrides

[`CapsuleContract`](CapsuleContract.md).[`id`](CapsuleContract.md#id)

***

### initialState?

> `readonly` `optional` **initialState?**: `Out`

Defined in: [core/src/capsule.ts:123](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/capsule.ts#L123)

Optional initial state for `stateMachine` arms — the fold seed for
[CapsuleContract.step](CapsuleContract.md#step)-driven harness tests.

#### Inherited from

[`CapsuleContract`](CapsuleContract.md).[`initialState`](CapsuleContract.md#initialstate)

***

### input

> `readonly` **input**: `Schema`\<`In`\>

Defined in: [core/src/capsule.ts:98](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/capsule.ts#L98)

#### Inherited from

[`CapsuleContract`](CapsuleContract.md).[`input`](CapsuleContract.md#input)

***

### invariants

> `readonly` **invariants**: readonly [`Invariant`](Invariant.md)\<`In`, `Out`\>[]

Defined in: [core/src/capsule.ts:101](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/capsule.ts#L101)

#### Inherited from

[`CapsuleContract`](CapsuleContract.md).[`invariants`](CapsuleContract.md#invariants)

***

### mutate?

> `readonly` `optional` **mutate?**: (`input`) => `Out` \| `Promise`\<`Out`\>

Defined in: [core/src/capsule.ts:150](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/capsule.ts#L150)

Optional invocation handler for `receiptedMutation` arms: applies the
mutation for a decoded input (`In`) and returns the decoded audit receipt
(`Out`). This is the typed runtime channel the harness drives to make the
idempotency and audit-receipt checks REAL — without it those checks have
nothing to invoke and the harness emits no test for them (justified
non-emission, not a skip).

MUST be pure and side-effect-free over the declared input domain: the
harness drives it twice with the SAME sampled input and asserts the two
receipts are deep-equal (idempotency). A handler that writes files, spawns
processes, or otherwise mutates external state does NOT belong here — wire
such side effects behind a separate runtime callable and leave `mutate`
undefined (the receipt CONTRACT is still proven via the schema round-trip).
May be async; the harness awaits it. Only meaningful for
`receiptedMutation` arms.

#### Parameters

##### input

`In`

#### Returns

`Out` \| `Promise`\<`Out`\>

#### Inherited from

[`CapsuleContract`](CapsuleContract.md).[`mutate`](CapsuleContract.md#mutate)

***

### name

> `readonly` **name**: `string`

Defined in: [core/src/capsule.ts:97](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/capsule.ts#L97)

#### Inherited from

[`CapsuleContract`](CapsuleContract.md).[`name`](CapsuleContract.md#name)

***

### output

> `readonly` **output**: `Schema`\<`Out`\>

Defined in: [core/src/capsule.ts:99](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/capsule.ts#L99)

#### Inherited from

[`CapsuleContract`](CapsuleContract.md).[`output`](CapsuleContract.md#output)

***

### reason?

> `readonly` `optional` **reason?**: `string`

Defined in: [core/src/capsule.ts:190](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/capsule.ts#L190)

REQUIRED when [receiptKind](CapsuleContract.md#receiptkind) is `'effect-outcome'` — a human-readable
justification for why this receipt cannot be driven by a pure core (and
therefore why the idempotency / audit / fault-injection checks are recorded
as a declared exemption rather than emitted real). Must be non-empty; the
harness writes it verbatim into the generated test file and the manifest.

#### Inherited from

[`CapsuleContract`](CapsuleContract.md).[`reason`](CapsuleContract.md#reason)

***

### receiptKind?

> `readonly` `optional` **receiptKind?**: `"pure-core"` \| `"effect-outcome"`

Defined in: [core/src/capsule.ts:182](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/capsule.ts#L182)

The TYPED escape hatch for the `receiptedMutation` mandatory-`mutate` rule.

Every receipted mutation MUST EITHER expose a pure [mutate](CapsuleContract.md#mutate) core (so
idempotency + audit-receipt + fault-injection become real, provable tests)
OR explicitly declare `receiptKind: 'effect-outcome'` here. A receipt that
is fundamentally the *outcome of an effect* — a value that only exists
once the side effect runs (a DOM morph's applied/failed status and live
timestamp; the exit code of a spawned process) — cannot be driven purely,
so it declares this exemption WITH a [reason](CapsuleContract.md#reason). The exemption is
machine-readable, surfaced in the generated test file, and recorded in the
capsule manifest — a waiver with teeth, never a silent gate-on-absence.

`defineCapsule` REJECTS a `receiptedMutation` that has NEITHER a `mutate`
handler NOR this exemption (with a non-empty `reason`): the absence of a
pure core must be a declared, justified choice, not an oversight that ships
green. `'pure-core'` is the implicit default when `mutate` is present and
never needs to be written. Only meaningful for `receiptedMutation` arms.

#### Inherited from

[`CapsuleContract`](CapsuleContract.md).[`receiptKind`](CapsuleContract.md#receiptkind)

***

### run?

> `readonly` `optional` **run?**: (`input`) => `Out`

Defined in: [core/src/capsule.ts:110](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/capsule.ts#L110)

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

Defined in: [core/src/capsule.ts:103](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/capsule.ts#L103)

#### Inherited from

[`CapsuleContract`](CapsuleContract.md).[`site`](CapsuleContract.md#site)

***

### step?

> `readonly` `optional` **step?**: (`state`, `event`) => `Out`

Defined in: [core/src/capsule.ts:118](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/capsule.ts#L118)

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
