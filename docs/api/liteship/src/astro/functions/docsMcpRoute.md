[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/astro](../README.md) / docsMcpRoute

# Function: docsMcpRoute()

> **docsMcpRoute**(`bundle`): (`request`) => `Promise`\<`Response`\>

Defined in: astro/dist/docs-mcp-route.d.ts:37

Minimal MCP-over-HTTP handler for docs tools: `docs/list`, `docs/search`, `docs/get`.
Accepts POST with JSON-RPC body; returns structured JSON (not stdio NDJSON).

## Parameters

### bundle

[`DocsMcpBundle`](../interfaces/DocsMcpBundle.md)

## Returns

(`request`) => `Promise`\<`Response`\>
