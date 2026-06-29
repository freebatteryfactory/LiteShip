[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [mcp-server/src](../README.md) / LspDiagnostic

# Interface: LspDiagnostic

Defined in: [mcp-server/src/lsp/types.ts:113](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/types.ts#L113)

LSP `Diagnostic` (§Diagnostic). `code` carries the gate `ruleId`; `source` is
the fixed `'czap-gauntlet'` provenance; `data` carries the assurance level +
coverage class (the rigor metadata an editor surfaces and a code-action reads
back). `message` is the finding's WHY (title + detail).

## Properties

### code

> `readonly` **code**: `string`

Defined in: [mcp-server/src/lsp/types.ts:116](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/types.ts#L116)

***

### data

> `readonly` **data**: `object`

Defined in: [mcp-server/src/lsp/types.ts:120](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/types.ts#L120)

Rigor metadata round-tripped to the code-action layer: assurance level + ruleId.

#### level

> `readonly` **level**: [`FindingLevel`](../type-aliases/FindingLevel.md)

#### ruleId

> `readonly` **ruleId**: `string`

***

### message

> `readonly` **message**: `string`

Defined in: [mcp-server/src/lsp/types.ts:118](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/types.ts#L118)

***

### range

> `readonly` **range**: [`LspRange`](LspRange.md)

Defined in: [mcp-server/src/lsp/types.ts:114](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/types.ts#L114)

***

### severity

> `readonly` **severity**: [`LspDiagnosticSeverity`](../type-aliases/LspDiagnosticSeverity.md)

Defined in: [mcp-server/src/lsp/types.ts:115](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/types.ts#L115)

***

### source

> `readonly` **source**: `string`

Defined in: [mcp-server/src/lsp/types.ts:117](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/types.ts#L117)
