[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [mcp-server/src](../README.md) / mcpResourceReaderUris

# Function: mcpResourceReaderUris()

> **mcpResourceReaderUris**(): readonly `string`[]

Defined in: [mcp-server/src/dispatch.ts:232](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/dispatch.ts#L232)

Enumerate the exact resources with a working reader through the production
routing law. This is a proof projection, not a second registry: every URI is
sourced from `listMcpResources`, then exercised through the same resolver arm
used by `resources/read`.

## Returns

readonly `string`[]
