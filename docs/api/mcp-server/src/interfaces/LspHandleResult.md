[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [mcp-server/src](../README.md) / LspHandleResult

# Interface: LspHandleResult

Defined in: [mcp-server/src/lsp/server.ts:84](https://github.com/heyoub/LiteShip/blob/main/packages/mcp-server/src/lsp/server.ts#L84)

The outcome of handling one LSP message: an optional response + any push notifications + a lifecycle signal.

## Properties

### exit

> `readonly` **exit**: `boolean`

Defined in: [mcp-server/src/lsp/server.ts:90](https://github.com/heyoub/LiteShip/blob/main/packages/mcp-server/src/lsp/server.ts#L90)

`true` once `exit` is received — the driver closes the loop.

***

### notifications

> `readonly` **notifications**: readonly [`LspNotification`](LspNotification.md)[]

Defined in: [mcp-server/src/lsp/server.ts:88](https://github.com/heyoub/LiteShip/blob/main/packages/mcp-server/src/lsp/server.ts#L88)

Server→client notifications to emit (e.g. publishDiagnostics after czap/check).

***

### response

> `readonly` **response**: [`JsonRpcResponse`](../type-aliases/JsonRpcResponse.md) \| `null`

Defined in: [mcp-server/src/lsp/server.ts:86](https://github.com/heyoub/LiteShip/blob/main/packages/mcp-server/src/lsp/server.ts#L86)

The JSON-RPC response, or `null` for a notification / `exit` (which gets none).
