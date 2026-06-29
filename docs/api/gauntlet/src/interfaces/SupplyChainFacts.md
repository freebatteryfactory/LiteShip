[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / SupplyChainFacts

# Interface: SupplyChainFacts

Defined in: [gauntlet/src/supply-chain-facts.ts:33](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/supply-chain-facts.ts#L33)

The four supply-chain fact families the host supplies. Every field is
OPTIONAL: a host that computed only some families (e.g. lockfile policy but no
ShipCapsule yet) supplies what it has, and the gate folds exactly what is
present. An ABSENT family is reported by the gate as an advisory
"not-evidenced" finding (honest under-coverage, never a silent green) — see
[supplyChainGate](../variables/supplyChainGate.md).

## Properties

### ci?

> `readonly` `optional` **ci?**: [`CiAuthorityFacts`](CiAuthorityFacts.md)

Defined in: [gauntlet/src/supply-chain-facts.ts:41](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/supply-chain-facts.ts#L41)

No-ambient-CI-authority verdict over .github/workflows.

***

### lockfile?

> `readonly` `optional` **lockfile?**: [`LockfilePolicyFacts`](LockfilePolicyFacts.md)

Defined in: [gauntlet/src/supply-chain-facts.ts:35](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/supply-chain-facts.ts#L35)

Lockfile-policy verdict over pnpm-lock.yaml + the workspace deps.

***

### provenance?

> `readonly` `optional` **provenance?**: [`ProvenanceFacts`](ProvenanceFacts.md)

Defined in: [gauntlet/src/supply-chain-facts.ts:39](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/supply-chain-facts.ts#L39)

ShipCapsule provenance verdict (recorded addresses vs the live tree).

***

### sbom?

> `readonly` `optional` **sbom?**: [`SbomFacts`](SbomFacts.md)

Defined in: [gauntlet/src/supply-chain-facts.ts:37](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/supply-chain-facts.ts#L37)

SBOM completeness verdict (every package covered + lockfile-matched).
