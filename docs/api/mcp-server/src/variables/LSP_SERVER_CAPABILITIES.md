[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [mcp-server/src](../README.md) / LSP\_SERVER\_CAPABILITIES

# Variable: LSP\_SERVER\_CAPABILITIES

> `const` **LSP\_SERVER\_CAPABILITIES**: `object`

Defined in: [mcp-server/src/lsp/server.ts:72](https://github.com/heyoub/LiteShip/blob/main/packages/mcp-server/src/lsp/server.ts#L72)

Server capabilities the LSP advertises in the `initialize` response. EXACTLY
the rigor surface: a code-action provider (quickfix only) + an open/close text
sync (TextDocumentSyncKind.None = 0 — the server is stateless about document
contents; diagnostics derive from the gauntlet fold over the workspace, not
from in-editor edits). Honest minimalism: a capability is declared only
because its method is implemented (mirrors the MCP `capabilities.ts` law).

## Type Declaration

### codeActionProvider

> `readonly` **codeActionProvider**: `object`

#### codeActionProvider.codeActionKinds

> `readonly` **codeActionKinds**: readonly \[`"quickfix"`\]

### diagnosticProvider

> `readonly` **diagnosticProvider**: `object`

Pull-diagnostics are answered (workspace/diagnostic); push is the primary channel.

#### diagnosticProvider.interFileDependencies

> `readonly` **interFileDependencies**: `true` = `true`

#### diagnosticProvider.workspaceDiagnostics

> `readonly` **workspaceDiagnostics**: `true` = `true`

### textDocumentSync

> `readonly` **textDocumentSync**: `0` = `0`
