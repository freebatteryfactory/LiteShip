[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [mcp-server/src](../README.md) / readUiResource

# Function: readUiResource()

> **readUiResource**(`uri`): [`McpUiResourceContents`](../interfaces/McpUiResourceContents.md)

Defined in: [mcp-server/src/ui-resources.ts:115](https://github.com/heyoub/LiteShip/blob/main/packages/mcp-server/src/ui-resources.ts#L115)

Read one UI resource by exact `ui://` URI. Unknown URI → ResourceNotFoundError (→ -32002), as for D3.

## Parameters

### uri

`string`

## Returns

[`McpUiResourceContents`](../interfaces/McpUiResourceContents.md)
