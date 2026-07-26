[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [mcp-server/src](../README.md) / runHttp

# Function: runHttp()

> **runHttp**(`bind`): `Promise`\<`HttpServerHandle`\>

Defined in: [mcp-server/src/http-server.ts:70](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/http-server.ts#L70)

Start the MCP HTTP server bound to `bind` and return its lifecycle handle.
This function never writes process output or installs signal handlers, so it
is safe to embed in another host.

## Parameters

### bind

`string` \| `number`

## Returns

`Promise`\<`HttpServerHandle`\>
