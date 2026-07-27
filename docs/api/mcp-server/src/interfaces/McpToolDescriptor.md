[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [mcp-server/src](../README.md) / McpToolDescriptor

# Interface: McpToolDescriptor

Defined in: [mcp-server/src/dispatch.ts:388](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/dispatch.ts#L388)

MCP tool catalog — projected from the ONE canonical command catalog in
@liteship/command (the mcpExposed subset). No hand-maintained parallel table:
this is the same descriptor source the CLI's `describe`/`completion`/`help`
project, so MCP `tools/list` and `liteship describe --format=mcp` agree by
construction.

## Properties

### \_meta?

> `optional` **\_meta?**: `object`

Defined in: [mcp-server/src/dispatch.ts:393](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/dispatch.ts#L393)

#### ui

> **ui**: `object`

##### ui.resourceUri

> **resourceUri**: `string`

***

### description

> **description**: `string`

Defined in: [mcp-server/src/dispatch.ts:390](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/dispatch.ts#L390)

***

### inputSchema

> **inputSchema**: `object`

Defined in: [mcp-server/src/dispatch.ts:391](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/dispatch.ts#L391)

***

### name

> **name**: `string`

Defined in: [mcp-server/src/dispatch.ts:389](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/dispatch.ts#L389)

***

### outputSchema?

> `optional` **outputSchema?**: `object`

Defined in: [mcp-server/src/dispatch.ts:392](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/dispatch.ts#L392)
