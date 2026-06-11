[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [mcp-server/src](../README.md) / readResource

# Function: readResource()

> **readResource**(`uri`): [`McpResourceContents`](../interfaces/McpResourceContents.md)

Defined in: [mcp-server/src/resources.ts:114](https://github.com/heyoub/LiteShip/blob/main/packages/mcp-server/src/resources.ts#L114)

Read one resource by exact URI. Throws [ResourceNotFoundError](https://github.com/heyoub/LiteShip/blob/main/packages/mcp-server/src/errors.ts) (→ -32002) for an unknown URI.

## Parameters

### uri

`string`

## Returns

[`McpResourceContents`](../interfaces/McpResourceContents.md)
