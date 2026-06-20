[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / ConsumerDiscovery

# Interface: ConsumerDiscovery

Defined in: [audit/src/consumer.ts:25](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/consumer.ts#L25)

## Properties

### missing

> `readonly` **missing**: readonly `string`[]

Defined in: [audit/src/consumer.ts:29](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/consumer.ts#L29)

Topology packages not installed in this repo — informational, not an error.

***

### packageRoots

> `readonly` **packageRoots**: `Readonly`\<`Record`\<`string`, `string`\>\>

Defined in: [audit/src/consumer.ts:27](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/consumer.ts#L27)

Package name → absolute (realpath'd, normalized) package root.
