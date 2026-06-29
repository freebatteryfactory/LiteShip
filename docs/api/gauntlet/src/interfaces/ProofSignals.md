[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / ProofSignals

# Interface: ProofSignals

Defined in: [gauntlet/src/proof-facts.ts:75](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/proof-facts.ts#L75)

The proof signals behind one module's blended [ModuleProof.localProof](ModuleProof.md#localproof) —
the evidence breakdown a weak-link finding shows so a reader can act (strengthen
the dependency's tests / enroll its invariant). Each is the raw signal the host
read; the host owns the blend, the gate owns the propagation.

## Properties

### coverage

> `readonly` **coverage**: `number` \| `null`

Defined in: [gauntlet/src/proof-facts.ts:79](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/proof-facts.ts#L79)

The module's line/statement coverage fraction in `[0, 1]`, or null if unmeasured.

***

### hasEnrolledInvariant

> `readonly` **hasEnrolledInvariant**: `boolean`

Defined in: [gauntlet/src/proof-facts.ts:83](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/proof-facts.ts#L83)

Whether at least one enrolled system invariant (traceability ledger) traces to this module.

***

### hasPropertyTest

> `readonly` **hasPropertyTest**: `boolean`

Defined in: [gauntlet/src/proof-facts.ts:81](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/proof-facts.ts#L81)

Whether the module has at least one PROPERTY (fast-check) test exercising it.

***

### mutationScore

> `readonly` **mutationScore**: `number` \| `null`

Defined in: [gauntlet/src/proof-facts.ts:77](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/proof-facts.ts#L77)

The module's mutation score in `[0, 1]` (killed / non-equivalent), or null if unmeasured.
