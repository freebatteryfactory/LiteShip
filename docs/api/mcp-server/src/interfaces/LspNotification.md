[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [mcp-server/src](../README.md) / LspNotification

# Interface: LspNotification

Defined in: [mcp-server/src/lsp/server.ts:88](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/server.ts#L88)

A message the server emits OUT-OF-BAND (a server→client notification, e.g.
`publishDiagnostics`) — distinct from a response to a request. The driver
frames + writes these; `handle` returns them alongside the response so the
transport stays a pure function of (incoming message, runner).

## Properties

### method

> `readonly` **method**: `string`

Defined in: [mcp-server/src/lsp/server.ts:89](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/server.ts#L89)

***

### params

> `readonly` **params**: `unknown`

Defined in: [mcp-server/src/lsp/server.ts:90](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/server.ts#L90)
