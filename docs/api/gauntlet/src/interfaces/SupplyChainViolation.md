[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / SupplyChainViolation

# Interface: SupplyChainViolation

Defined in: [gauntlet/src/facts/supply-chain-facts.ts:45](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/supply-chain-facts.ts#L45)

A single decided supply-chain violation — a verdict + its WHY + where.

## Properties

### code

> `readonly` **code**: `string`

Defined in: [gauntlet/src/facts/supply-chain-facts.ts:51](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/supply-chain-facts.ts#L51)

Stable sub-rule id, suffixed onto the gate's ruleId namespace (e.g.
`git-url-dependency`, `floating-resolution`, `prerelease-range`,
`lockfile-address-drift`, `incomplete-sbom`, `ambient-publish-token`).

***

### detail

> `readonly` **detail**: `string`

Defined in: [gauntlet/src/facts/supply-chain-facts.ts:53](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/supply-chain-facts.ts#L53)

Human-readable WHY — enough to act on without re-reading the lockfile.

***

### subject

> `readonly` **subject**: `string`

Defined in: [gauntlet/src/facts/supply-chain-facts.ts:55](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/supply-chain-facts.ts#L55)

The artifact the violation points at (a package key, a workflow path, …).
