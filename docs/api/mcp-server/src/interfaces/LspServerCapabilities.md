[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [mcp-server/src](../README.md) / LspServerCapabilities

# Interface: LspServerCapabilities

Defined in: [mcp-server/src/lsp/server.ts:124](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/server.ts#L124)

Server capabilities the LSP advertises in the `initialize` response. EXACTLY
the rigor surface: a code-action provider (quickfix only) + an open/close text
sync (TextDocumentSyncKind.None = 0 — the server is stateless about document
contents; diagnostics derive from the gauntlet fold over the workspace, not
from in-editor edits). Honest minimalism: a capability is declared only
because its method is implemented (mirrors the MCP `capabilities.ts` law).

## Properties

### codeActionProvider

> `readonly` **codeActionProvider**: `object`

Defined in: [mcp-server/src/lsp/server.ts:126](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/server.ts#L126)

#### codeActionKinds

> `readonly` **codeActionKinds**: readonly \[`"quickfix"`\]

***

### diagnosticProvider

> `readonly` **diagnosticProvider**: `object`

Defined in: [mcp-server/src/lsp/server.ts:127](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/server.ts#L127)

#### interFileDependencies

> `readonly` **interFileDependencies**: `true`

#### workspaceDiagnostics

> `readonly` **workspaceDiagnostics**: `true`

***

### textDocumentSync

> `readonly` **textDocumentSync**: `0`

Defined in: [mcp-server/src/lsp/server.ts:125](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/server.ts#L125)
