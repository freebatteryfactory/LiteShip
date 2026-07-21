[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / CheckGovernanceFacts

# Interface: CheckGovernanceFacts

Defined in: [gauntlet/src/facts/check-governance-facts.ts:87](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/check-governance-facts.ts#L87)

The injected FactPack the three check-governance meta-gates consume. Each gate reads
exactly one slice: `check-registry-complete` reads [CheckGovernanceFacts.partition](#partition),
`check-negative-control` reads [CheckGovernanceFacts.negativeControls](#negativecontrols),
`check-waiver-freshness` reads [CheckGovernanceFacts.waivers](#waivers). When the pack is
ABSENT (the lean production path, where no host injects it) every gate folds an empty
verdict — the real enforcement over the repo lives in the `tests/unit/devops` meta-test.

## Properties

### negativeControls

> `readonly` **negativeControls**: readonly [`NegativeControlFact`](NegativeControlFact.md)[]

Defined in: [gauntlet/src/facts/check-governance-facts.ts:91](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/check-governance-facts.ts#L91)

The per-blocking-check negative-control evidence (for `check-negative-control`).

***

### partition

> `readonly` **partition**: [`CheckPartitionFacts`](CheckPartitionFacts.md)

Defined in: [gauntlet/src/facts/check-governance-facts.ts:89](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/check-governance-facts.ts#L89)

The root-script partition evidence (for `check-registry-complete`).

***

### waivers

> `readonly` **waivers**: readonly [`WaiverFreshnessFact`](WaiverFreshnessFact.md)[]

Defined in: [gauntlet/src/facts/check-governance-facts.ts:93](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/check-governance-facts.ts#L93)

The per-waiver freshness evidence across both stores (for `check-waiver-freshness`).
