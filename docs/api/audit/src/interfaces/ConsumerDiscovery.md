[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / ConsumerDiscovery

# Interface: ConsumerDiscovery

Defined in: [audit/src/consumer.ts:24](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/consumer.ts#L24)

## Properties

### missing

> `readonly` **missing**: readonly `string`[]

Defined in: [audit/src/consumer.ts:28](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/consumer.ts#L28)

Topology packages not installed in this repo — informational, not an error.

***

### packageRoots

> `readonly` **packageRoots**: `Readonly`\<`Record`\<`string`, `string`\>\>

Defined in: [audit/src/consumer.ts:26](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/consumer.ts#L26)

Package name → absolute (realpath'd, normalized) package root.
