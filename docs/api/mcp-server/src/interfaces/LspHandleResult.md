[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [mcp-server/src](../README.md) / LspHandleResult

# Interface: LspHandleResult

Defined in: [mcp-server/src/lsp/server.ts:189](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/server.ts#L189)

The outcome of handling one LSP message: an optional response + any push notifications + a lifecycle signal.

## Properties

### exit

> `readonly` **exit**: `boolean`

Defined in: [mcp-server/src/lsp/server.ts:195](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/server.ts#L195)

`true` once `exit` is received — the driver closes the loop.

***

### notifications

> `readonly` **notifications**: readonly [`LspNotification`](LspNotification.md)[]

Defined in: [mcp-server/src/lsp/server.ts:193](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/server.ts#L193)

Server→client notifications to emit (e.g. publishDiagnostics after liteship/check).

***

### response

> `readonly` **response**: [`JsonRpcResponse`](../type-aliases/JsonRpcResponse.md) \| `null`

Defined in: [mcp-server/src/lsp/server.ts:191](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/server.ts#L191)

The JSON-RPC response, or `null` for a notification / `exit` (which gets none).
