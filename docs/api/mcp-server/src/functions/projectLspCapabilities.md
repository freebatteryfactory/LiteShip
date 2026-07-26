[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [mcp-server/src](../README.md) / projectLspCapabilities

# Function: projectLspCapabilities()

> **projectLspCapabilities**(`catalog`): [`LspServerCapabilities`](../interfaces/LspServerCapabilities.md)

Defined in: [mcp-server/src/lsp/server.ts:135](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/server.ts#L135)

Derive the advertised capability projection from an explicit method catalog.
Missing either backing handler is a construction error, so a catalog mutation
cannot leave a stale capability green.

## Parameters

### catalog

readonly [`LspMethodDescriptor`](../interfaces/LspMethodDescriptor.md)[]

## Returns

[`LspServerCapabilities`](../interfaces/LspServerCapabilities.md)
