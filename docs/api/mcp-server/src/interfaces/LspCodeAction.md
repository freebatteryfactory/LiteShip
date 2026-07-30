[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [mcp-server/src](../README.md) / LspCodeAction

# Interface: LspCodeAction

Defined in: [mcp-server/src/lsp/types.ts:143](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/types.ts#L143)

LSP `CodeAction` (§textDocument/codeAction). Both patch and instruction
remediations project to client-executed commands. The lean server has no
document store and therefore does not advertise or model WorkspaceEdit.
`diagnostics` links the action back to the diagnostic it fixes.

## Properties

### command?

> `readonly` `optional` **command?**: [`LspCommand`](LspCommand.md)

Defined in: [mcp-server/src/lsp/types.ts:147](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/types.ts#L147)

***

### diagnostics

> `readonly` **diagnostics**: readonly [`LspDiagnostic`](LspDiagnostic.md)[]

Defined in: [mcp-server/src/lsp/types.ts:146](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/types.ts#L146)

***

### kind

> `readonly` **kind**: `string`

Defined in: [mcp-server/src/lsp/types.ts:145](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/types.ts#L145)

***

### title

> `readonly` **title**: `string`

Defined in: [mcp-server/src/lsp/types.ts:144](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/types.ts#L144)
