[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / InvariantProven

# Interface: InvariantProven

Defined in: [gauntlet/src/facts/traceability-facts.ts:49](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/traceability-facts.ts#L49)

PROVEN — a claimed test exists and carries the matching `PROVES` header.

## Properties

### \_tag

> `readonly` **\_tag**: `"proven"`

Defined in: [gauntlet/src/facts/traceability-facts.ts:50](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/traceability-facts.ts#L50)

***

### provingTests

> `readonly` **provingTests**: readonly `string`[]

Defined in: [gauntlet/src/facts/traceability-facts.ts:52](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/traceability-facts.ts#L52)

The proving-test refs (`file::test-name`) that PROVE this invariant.
