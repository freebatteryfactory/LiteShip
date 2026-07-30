[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [mcp-server/src](../README.md) / LspMethodDescriptor

# Interface: LspMethodDescriptor

Defined in: [mcp-server/src/lsp/server.ts:67](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/server.ts#L67)

One exact method row in the LSP public protocol projection.

## Properties

### direction

> `readonly` **direction**: `"client-to-server"` \| `"server-to-client"`

Defined in: [mcp-server/src/lsp/server.ts:69](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/server.ts#L69)

***

### messageKind

> `readonly` **messageKind**: `"request"` \| `"notification"` \| `"either"`

Defined in: [mcp-server/src/lsp/server.ts:70](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/server.ts#L70)

***

### method

> `readonly` **method**: `"initialize"` \| `"exit"` \| `"initialized"` \| `"liteship/check"` \| `"textDocument/diagnostic"` \| `"workspace/diagnostic"` \| `"textDocument/codeAction"` \| `"shutdown"` \| `"textDocument/publishDiagnostics"` \| `"window/logMessage"`

Defined in: [mcp-server/src/lsp/server.ts:68](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/server.ts#L68)

***

### phase

> `readonly` **phase**: `"shutdown"` \| `"initial"` \| `"active"` \| `"outbound"`

Defined in: [mcp-server/src/lsp/server.ts:71](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/server.ts#L71)
