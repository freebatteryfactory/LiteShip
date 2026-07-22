[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / ConsumerDiscovery

# Interface: ConsumerDiscovery

Defined in: [audit/src/consumer.ts:34](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/consumer.ts#L34)

## Properties

### missing

> `readonly` **missing**: readonly `string`[]

Defined in: [audit/src/consumer.ts:38](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/consumer.ts#L38)

Topology packages not installed in this repo — informational, not an error.

***

### packageRoots

> `readonly` **packageRoots**: `Readonly`\<`Record`\<`string`, `string`\>\>

Defined in: [audit/src/consumer.ts:36](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/consumer.ts#L36)

Package name → absolute (realpath'd, normalized) package root.
