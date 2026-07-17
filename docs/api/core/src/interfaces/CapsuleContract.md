[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / CapsuleContract

# Interface: CapsuleContract\<K, In, Out, R\>

Defined in: [core/src/capsule.ts:137](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/capsule.ts#L137)

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

Defined in: [core/src/capsule.ts:138](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/capsule.ts#L138)

***

### attribution?

> `readonly` `optional` **attribution?**: [`AttributionDecl`](AttributionDecl.md)

Defined in: [core/src/capsule.ts:147](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/capsule.ts#L147)

***

### budgets

> `readonly` **budgets**: [`BudgetDecl`](BudgetDecl.md)

Defined in: [core/src/capsule.ts:145](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/capsule.ts#L145)

***

### capabilities

> `readonly` **capabilities**: [`CapabilityDecl`](CapabilityDecl.md)\<`R`\>

Defined in: [core/src/capsule.ts:143](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/capsule.ts#L143)

***

### decide?

> `readonly` `optional` **decide?**: (`subject`) => [`Decision`](Decision.md)

Defined in: [core/src/capsule.ts:254](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/capsule.ts#L254)

The decision channel for `policyGate` arms: resolve an `allow`/`deny`
[Decision](Decision.md) (verdict + reason chain) against a decoded subject (`In`).
This is the typed runtime channel the harness drives to make the allow/deny
coverage, reason-chain integrity, and determinism checks REAL — without it a
`policyGate` has no decision to drive and the harness FAILS LOUD (a
`policyGate` MUST expose a `decide` core, enforced by `defineCapsule`).

MUST be PURE and TOTAL over the declared subject domain (the same discipline
as `mutate`): the harness drives it twice with the SAME sampled subject and
asserts the two verdicts are deep-equal (determinism). A handler that calls a
provider, reads a clock, mutates state, or otherwise enforces the verdict does
NOT belong here — a policyGate returns a verdict, it never enforces it. Wire
side-effecting admission behind a separate downstream producer (ADR-0014 "no
built-in authority") and keep `decide` a pure verdict function.

`Out` is the verdict shape: a `policyGate` declares `output` as the
[Decision](Decision.md) schema, so the generated reason-chain check decodes each
reason against it. Only meaningful for `policyGate` arms.

#### Parameters

##### subject

`In`

#### Returns

[`Decision`](Decision.md)

***

### derive?

> `readonly` `optional` **derive?**: (`source`) => `Out` \| `Promise`\<`Out`\>

Defined in: [core/src/capsule.ts:175](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/capsule.ts#L175)

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

### faults?

> `readonly` `optional` **faults?**: readonly `FaultDecl`\<`In`\>[]

Defined in: [core/src/capsule.ts:205](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/capsule.ts#L205)

Declared faults for `receiptedMutation` arms — failure modes the capsule
promises are reachable. The harness drives each fault's
[FaultDecl.trigger](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/capsule.ts) through [CapsuleContract.mutate](#mutate) and
asserts it surfaces as declared. Requires `mutate`. Under the mandatory
`mutate` requirement (see the kind-level rule below) every receipted
mutation with a pure core declares at least one fault — a capsule with a
genuinely fault-free core may declare an empty table, in which case the
fault-injection check is non-emitted (nothing to prove reachable). Only
meaningful for `receiptedMutation` arms.

***

### id

> `readonly` **id**: `ContentAddress`

Defined in: [core/src/capsule.ts:139](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/capsule.ts#L139)

***

### initialState?

> `readonly` `optional` **initialState?**: `Out`

Defined in: [core/src/capsule.ts:166](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/capsule.ts#L166)

Optional initial state for `stateMachine` arms — the fold seed for
[CapsuleContract.step](#step)-driven harness tests.

***

### input

> `readonly` **input**: [`SchemaPort`](SchemaPort.md)\<`In`, `In`\> \| [`DeclarationSchema`](DeclarationSchema.md)\<`In`\>

Defined in: [core/src/capsule.ts:141](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/capsule.ts#L141)

***

### invariants

> `readonly` **invariants**: readonly [`Invariant`](Invariant.md)\<`In`, `Out`\>[]

Defined in: [core/src/capsule.ts:144](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/capsule.ts#L144)

***

### mutate?

> `readonly` `optional` **mutate?**: (`input`) => `Out` \| `Promise`\<`Out`\>

Defined in: [core/src/capsule.ts:193](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/capsule.ts#L193)

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

***

### name

> `readonly` **name**: `string`

Defined in: [core/src/capsule.ts:140](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/capsule.ts#L140)

***

### output

> `readonly` **output**: [`SchemaPort`](SchemaPort.md)\<`Out`, `Out`\> \| [`DeclarationSchema`](DeclarationSchema.md)\<`Out`\>

Defined in: [core/src/capsule.ts:142](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/capsule.ts#L142)

***

### reason?

> `readonly` `optional` **reason?**: `string`

Defined in: [core/src/capsule.ts:233](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/capsule.ts#L233)

REQUIRED when [receiptKind](#receiptkind) is `'effect-outcome'` — a human-readable
justification for why this receipt cannot be driven by a pure core (and
therefore why the idempotency / audit / fault-injection checks are recorded
as a declared exemption rather than emitted real). Must be non-empty; the
harness writes it verbatim into the generated test file and the manifest.

***

### receiptKind?

> `readonly` `optional` **receiptKind?**: `"pure-core"` \| `"effect-outcome"`

Defined in: [core/src/capsule.ts:225](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/capsule.ts#L225)

The TYPED escape hatch for the `receiptedMutation` mandatory-`mutate` rule.

Every receipted mutation MUST EITHER expose a pure [mutate](#mutate) core (so
idempotency + audit-receipt + fault-injection become real, provable tests)
OR explicitly declare `receiptKind: 'effect-outcome'` here. A receipt that
is fundamentally the *outcome of an effect* — a value that only exists
once the side effect runs (a DOM morph's applied/failed status and live
timestamp; the exit code of a spawned process) — cannot be driven purely,
so it declares this exemption WITH a [reason](#reason). The exemption is
machine-readable, surfaced in the generated test file, and recorded in the
capsule manifest — a waiver with teeth, never a silent gate-on-absence.

`defineCapsule` REJECTS a `receiptedMutation` that has NEITHER a `mutate`
handler NOR this exemption (with a non-empty `reason`): the absence of a
pure core must be a declared, justified choice, not an oversight that ships
green. `'pure-core'` is the implicit default when `mutate` is present and
never needs to be written. Only meaningful for `receiptedMutation` arms.

***

### run?

> `readonly` `optional` **run?**: (`input`) => `Out`

Defined in: [core/src/capsule.ts:153](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/capsule.ts#L153)

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

Defined in: [core/src/capsule.ts:146](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/capsule.ts#L146)

***

### step?

> `readonly` `optional` **step?**: (`state`, `event`) => `Out`

Defined in: [core/src/capsule.ts:161](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/capsule.ts#L161)

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
