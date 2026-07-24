[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / CheckPartitionFacts

# Interface: CheckPartitionFacts

Defined in: [gauntlet/src/facts/check-governance-facts.ts:33](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/check-governance-facts.ts#L33)

The root-script PARTITION evidence for `check-registry-complete`: the full set of
root scripts, the registered checks (with their referenced script + resolution),
and the exempted script names. The law is TOTAL + DISJOINT — every root script is
registered XOR exempt, and every registered command resolves to a real script.

## Properties

### exempted

> `readonly` **exempted**: readonly `string`[]

Defined in: [gauntlet/src/facts/check-governance-facts.ts:39](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/check-governance-facts.ts#L39)

The exempted root-script names (one per `SCRIPT_EXEMPTIONS` entry).

***

### registered

> `readonly` **registered**: readonly [`RegisteredCheckFact`](RegisteredCheckFact.md)[]

Defined in: [gauntlet/src/facts/check-governance-facts.ts:37](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/check-governance-facts.ts#L37)

The registered checks (one per `CHECK_REGISTRY` entry).

***

### scripts

> `readonly` **scripts**: readonly `string`[]

Defined in: [gauntlet/src/facts/check-governance-facts.ts:35](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/check-governance-facts.ts#L35)

Every root `package.json` script name.
