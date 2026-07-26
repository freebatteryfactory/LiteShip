[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [mcp-server/src](../README.md) / LspHandleResult

# Interface: LspHandleResult

Defined in: [mcp-server/src/lsp/server.ts:170](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/server.ts#L170)

The outcome of handling one LSP message: an optional response + any push notifications + a lifecycle signal.

## Properties

### exit

> `readonly` **exit**: `boolean`

Defined in: [mcp-server/src/lsp/server.ts:176](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/server.ts#L176)

`true` once `exit` is received — the driver closes the loop.

***

### notifications

> `readonly` **notifications**: readonly [`LspNotification`](LspNotification.md)[]

Defined in: [mcp-server/src/lsp/server.ts:174](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/server.ts#L174)

Server→client notifications to emit (e.g. publishDiagnostics after liteship/check).

***

### response

> `readonly` **response**: [`JsonRpcResponse`](../type-aliases/JsonRpcResponse.md) \| `null`

Defined in: [mcp-server/src/lsp/server.ts:172](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/server.ts#L172)

The JSON-RPC response, or `null` for a notification / `exit` (which gets none).
