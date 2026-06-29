[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [mcp-server/src](../README.md) / readManifestResource

# Function: readManifestResource()

> **readManifestResource**(`uri`): [`McpResourceContents`](../interfaces/McpResourceContents.md)

Defined in: [mcp-server/src/manifest-resource.ts:60](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/manifest-resource.ts#L60)

Read the manifest resource. Any other `liteship://mcp-app/…` URI → `NotFoundError` (→ -32002).

## Parameters

### uri

`string`

## Returns

[`McpResourceContents`](../interfaces/McpResourceContents.md)
