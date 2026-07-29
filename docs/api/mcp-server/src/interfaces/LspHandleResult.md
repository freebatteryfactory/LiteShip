[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [mcp-server/src](../README.md) / LspHandleResult

# Interface: LspHandleResult

Defined in: [mcp-server/src/lsp/server.ts:190](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/server.ts#L190)

The outcome of handling one LSP message: an optional response + any push notifications + a lifecycle signal.

## Properties

### exit

> `readonly` **exit**: `boolean`

Defined in: [mcp-server/src/lsp/server.ts:196](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/server.ts#L196)

`true` once `exit` is received — the driver closes the loop.

***

### notifications

> `readonly` **notifications**: readonly [`LspNotification`](LspNotification.md)[]

Defined in: [mcp-server/src/lsp/server.ts:194](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/server.ts#L194)

Server→client notifications to emit (e.g. publishDiagnostics after liteship/check).

***

### response

> `readonly` **response**: [`JsonRpcResponse`](../type-aliases/JsonRpcResponse.md) \| `null`

Defined in: [mcp-server/src/lsp/server.ts:192](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/server.ts#L192)

The JSON-RPC response, or `null` for a notification / `exit` (which gets none).
