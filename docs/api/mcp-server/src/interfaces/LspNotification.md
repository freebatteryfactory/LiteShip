[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [mcp-server/src](../README.md) / LspNotification

# Interface: LspNotification

Defined in: [mcp-server/src/lsp/server.ts:78](https://github.com/heyoub/LiteShip/blob/main/packages/mcp-server/src/lsp/server.ts#L78)

A message the server emits OUT-OF-BAND (a server→client notification, e.g.
`publishDiagnostics`) — distinct from a response to a request. The driver
frames + writes these; `handle` returns them alongside the response so the
transport stays a pure function of (incoming message, runner).

## Properties

### method

> `readonly` **method**: `string`

Defined in: [mcp-server/src/lsp/server.ts:79](https://github.com/heyoub/LiteShip/blob/main/packages/mcp-server/src/lsp/server.ts#L79)

***

### params

> `readonly` **params**: `unknown`

Defined in: [mcp-server/src/lsp/server.ts:80](https://github.com/heyoub/LiteShip/blob/main/packages/mcp-server/src/lsp/server.ts#L80)
