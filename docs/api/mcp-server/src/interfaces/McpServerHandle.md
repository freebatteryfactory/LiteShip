[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [mcp-server/src](../README.md) / McpServerHandle

# Interface: McpServerHandle

Defined in: [mcp-server/src/start.ts:38](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/start.ts#L38)

Explicit lifecycle authority returned to every embedded MCP host.

## Properties

### done

> `readonly` **done**: `Promise`\<`void`\>

Defined in: [mcp-server/src/start.ts:40](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/start.ts#L40)

***

### transport

> `readonly` **transport**: `"http"` \| `"stdio"`

Defined in: [mcp-server/src/start.ts:39](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/start.ts#L39)

## Methods

### stop()

> **stop**(): `Promise`\<`void`\>

Defined in: [mcp-server/src/start.ts:41](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/start.ts#L41)

#### Returns

`Promise`\<`void`\>
