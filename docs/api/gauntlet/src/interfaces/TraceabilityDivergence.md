[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / TraceabilityDivergence

# Interface: TraceabilityDivergence

Defined in: [gauntlet/src/facts/traceability-facts.ts:100](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/traceability-facts.ts#L100)

A ledger⇔header DIVERGENCE — the two halves of the bidirectional trace disagree.
Either a test `PROVES` an INV absent from the ledger (`undeclared-proof`), or a
ledger entry claims a test whose header does NOT name the invariant
(`unbacked-claim`). Both are findings (the ledger and the tests must agree — the
head-probe LAW).

## Properties

### detail

> `readonly` **detail**: `string`

Defined in: [gauntlet/src/facts/traceability-facts.ts:113](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/traceability-facts.ts#L113)

Human-readable WHY — enough to act on without re-reading the ledger.

***

### invariantId

> `readonly` **invariantId**: `string`

Defined in: [gauntlet/src/facts/traceability-facts.ts:111](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/traceability-facts.ts#L111)

The invariant id the divergence concerns.

***

### kind

> `readonly` **kind**: `"undeclared-proof"` \| `"unbacked-claim"` \| `"missing-test"`

Defined in: [gauntlet/src/facts/traceability-facts.ts:109](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/traceability-facts.ts#L109)

`undeclared-proof`: a `PROVES: INV-X` header names an INV not in invariants.yaml.
`unbacked-claim`:   a ledger `tests:` ref points at a test whose header does not
                    name this invariant (a hardcoded claim diverged from the live
                    header).
`missing-test`:     a ledger `tests:` ref points at a test that does not exist in
                    the corpus (the claimed proof is absent).

***

### subject

> `readonly` **subject**: `string`

Defined in: [gauntlet/src/facts/traceability-facts.ts:115](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/traceability-facts.ts#L115)

The artifact the divergence points at (a test ref or the ledger entry).
