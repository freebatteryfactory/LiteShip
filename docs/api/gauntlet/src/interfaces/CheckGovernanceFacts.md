[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / CheckGovernanceFacts

# Interface: CheckGovernanceFacts

Defined in: [gauntlet/src/facts/check-governance-facts.ts:81](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/check-governance-facts.ts#L81)

The injected FactPack the three check-governance meta-gates consume. Each gate reads
exactly one slice: `check-registry-complete` reads [CheckGovernanceFacts.partition](#partition),
`check-negative-control` reads [CheckGovernanceFacts.negativeControls](#negativecontrols),
`check-waiver-freshness` reads [CheckGovernanceFacts.waivers](#waivers). When the pack is
ABSENT while a check-governance gate is selected, execution-plan validation fails
before any gate runs. A host with genuinely no checks supplies an explicit empty
pack; absence can never masquerade as a green verdict.

## Properties

### negativeControls

> `readonly` **negativeControls**: readonly [`NegativeControlFact`](NegativeControlFact.md)[]

Defined in: [gauntlet/src/facts/check-governance-facts.ts:85](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/check-governance-facts.ts#L85)

The per-blocking-check negative-control evidence (for `check-negative-control`).

***

### partition

> `readonly` **partition**: [`CheckPartitionFacts`](CheckPartitionFacts.md)

Defined in: [gauntlet/src/facts/check-governance-facts.ts:83](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/check-governance-facts.ts#L83)

The root-script partition evidence (for `check-registry-complete`).

***

### waivers

> `readonly` **waivers**: readonly [`WaiverFreshnessFact`](WaiverFreshnessFact.md)[]

Defined in: [gauntlet/src/facts/check-governance-facts.ts:87](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/check-governance-facts.ts#L87)

The per-waiver freshness evidence across both stores (for `check-waiver-freshness`).
