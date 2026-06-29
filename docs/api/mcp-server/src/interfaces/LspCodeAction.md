[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [mcp-server/src](../README.md) / LspCodeAction

# Interface: LspCodeAction

Defined in: [mcp-server/src/lsp/types.ts:186](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/types.ts#L186)

LSP `CodeAction` (§textDocument/codeAction). A `patch` remediation projects to
an `edit` (a machine-applicable [LspWorkspaceEdit](LspWorkspaceEdit.md) carrying the diff for
the client to apply); an `instruction` remediation projects to a `command`
(the client surfaces the ordered steps). `diagnostics` links the action back
to the diagnostic it fixes (§CodeAction.diagnostics).

## Properties

### command?

> `readonly` `optional` **command?**: [`LspCommand`](LspCommand.md)

Defined in: [mcp-server/src/lsp/types.ts:191](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/types.ts#L191)

***

### diagnostics

> `readonly` **diagnostics**: readonly [`LspDiagnostic`](LspDiagnostic.md)[]

Defined in: [mcp-server/src/lsp/types.ts:189](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/types.ts#L189)

***

### edit?

> `readonly` `optional` **edit?**: [`LspWorkspaceEdit`](LspWorkspaceEdit.md)

Defined in: [mcp-server/src/lsp/types.ts:190](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/types.ts#L190)

***

### kind

> `readonly` **kind**: `string`

Defined in: [mcp-server/src/lsp/types.ts:188](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/types.ts#L188)

***

### title

> `readonly` **title**: `string`

Defined in: [mcp-server/src/lsp/types.ts:187](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/types.ts#L187)
