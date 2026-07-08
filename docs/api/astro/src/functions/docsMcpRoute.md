[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [astro/src](../README.md) / docsMcpRoute

# Function: docsMcpRoute()

> **docsMcpRoute**(`bundle`): (`request`) => `Promise`\<`Response`\>

Defined in: [astro/src/docs-mcp-route.ts:77](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/docs-mcp-route.ts#L77)

Minimal MCP-over-HTTP handler for docs tools: `docs/list`, `docs/search`, `docs/get`.
Accepts POST with JSON-RPC body; returns structured JSON (not stdio NDJSON).

## Parameters

### bundle

[`DocsMcpBundle`](../interfaces/DocsMcpBundle.md)

## Returns

(`request`) => `Promise`\<`Response`\>
