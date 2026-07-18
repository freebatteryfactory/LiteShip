[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / TransitionFacts

# Interface: TransitionFacts

Defined in: [gauntlet/src/transition-facts.ts:98](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/transition-facts.ts#L98)

The host-supplied bisimulation evidence over one conformance FAMILY's run. The
capture is HEAVY (an `Effect.runPromise` fiber walk per case, drained to
quiescence), so production runs it OPT-IN (`czap check --ir --transition`), scoped
+ cached; when the host did not run it this whole capability is simply ABSENT from
the [GateContext](GateContext.md) and the gate is not in the set (no cost, no noise). When
present it carries every per-case verdict plus the two transport fingerprints and
the committed unevidenced BASELINE the ratchet compares against.

ONE family per facts object (the gate aims a single assurance level at it, resolved
from the family). A run that spans multiple conformance families builds one
TransitionFacts per family; the host injects them one at a time, the same
single-context-field shape [MutationFacts](MutationFacts.md) rides.

## Properties

### cases

> `readonly` **cases**: readonly [`TransitionCase`](TransitionCase.md)[]

Defined in: [gauntlet/src/transition-facts.ts:120](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/transition-facts.ts#L120)

Every evaluated bisimulation case's outcome — the substrate the gate folds.

***

### family

> `readonly` **family**: `string`

Defined in: [gauntlet/src/transition-facts.ts:105](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/transition-facts.ts#L105)

The conformance family this evidence covers (e.g. `'cell'`, `'store'`,
`'reactive-replay1'`). Names WHAT bisimulation relation was checked and aims the
gate's level (the reactive kernels resolve L4 — the trust spine). Woven into every
finding for traceability.

***

### implementationDigest

> `readonly` **implementationDigest**: `string`

Defined in: [gauntlet/src/transition-facts.ts:118](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/transition-facts.ts#L118)

The content address of the IMPLEMENTATION transport under test (the Effect-backed
primitive this wave; the CellKernel-backed primitive in Wave 6). Fingerprints the
exact implementation the bisimulation was checked against.

***

### modelDigest

> `readonly` **modelDigest**: `string`

Defined in: [gauntlet/src/transition-facts.ts:112](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/transition-facts.ts#L112)

The content address of the MODEL transport — the single-oracle `fc.commands` model
DERIVED from the CellKernel/Lifetime law tables (LS-001). Fingerprints WHICH model
produced the reference observations, so a finding can name the exact oracle version
two transports disagreed under.

***

### operationCoverage

> `readonly` **operationCoverage**: `Readonly`\<`Record`\<`string`, `number`\>\>

Defined in: [gauntlet/src/transition-facts.ts:127](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/transition-facts.ts#L127)

How many cases exercised each operation tag (`subscribe`/`set`/`update`/… → count)
— the coverage read of the corpus. A tag mapped to 0 (or absent) is an op the
corpus never drove: a gap the gate can surface (an unexercised transition is
unproven, not proven-equivalent).

***

### unevidencedBaseline?

> `readonly` `optional` **unevidencedBaseline?**: `number`

Defined in: [gauntlet/src/transition-facts.ts:136](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/transition-facts.ts#L136)

The committed maximum tolerated `unevidenced` case count for this family (the
ratchet artifact). A fresh run whose unevidenced count RISES above this baseline is
a regression finding (the count may only ever fall — more evidence over time, never
less). OMITTED → no committed floor: the family's first measurement is reported
informationally (each unevidenced case an advisory), never a regression, exactly as
[MutationFacts.scoreBaseline](MutationFacts.md#scorebaseline)'s absent-file semantics.
