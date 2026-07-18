[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / ConsumerDiscovery

# Interface: ConsumerDiscovery

Defined in: [audit/src/consumer.ts:72](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/consumer.ts#L72)

## Properties

### missing

> `readonly` **missing**: readonly `string`[]

Defined in: [audit/src/consumer.ts:76](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/consumer.ts#L76)

Topology packages not installed in this repo — informational, not an error.

***

### packageRoots

> `readonly` **packageRoots**: `Readonly`\<`Record`\<`string`, `string`\>\>

Defined in: [audit/src/consumer.ts:74](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/consumer.ts#L74)

Package name → absolute (realpath'd, normalized) package root.
