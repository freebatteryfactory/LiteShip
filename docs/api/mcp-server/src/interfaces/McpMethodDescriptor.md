[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [mcp-server/src](../README.md) / McpMethodDescriptor

# Interface: McpMethodDescriptor

Defined in: [mcp-server/src/capabilities.ts:18](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/capabilities.ts#L18)

One implemented MCP method, its message kind, and the capability it earns.

## Properties

### capability?

> `readonly` `optional` **capability?**: `"tools"` \| `"resources"` \| `"prompts"` \| `"ui"`

Defined in: [mcp-server/src/capabilities.ts:30](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/capabilities.ts#L30)

***

### messageKind

> `readonly` **messageKind**: `"request"` \| `"notification"`

Defined in: [mcp-server/src/capabilities.ts:29](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/capabilities.ts#L29)

***

### method

> `readonly` **method**: `"initialize"` \| `"notifications/initialized"` \| `"tools/list"` \| `"tools/call"` \| `"resources/list"` \| `"resources/read"` \| `"prompts/list"` \| `"prompts/get"` \| `"ui/call-tool"`

Defined in: [mcp-server/src/capabilities.ts:19](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/capabilities.ts#L19)
