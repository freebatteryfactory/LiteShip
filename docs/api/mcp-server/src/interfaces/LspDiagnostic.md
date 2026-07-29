[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [mcp-server/src](../README.md) / LspDiagnostic

# Interface: LspDiagnostic

Defined in: [mcp-server/src/lsp/types.ts:102](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/types.ts#L102)

LSP `Diagnostic` (§Diagnostic). `code` carries the gate `ruleId`; `source` is
the fixed `'liteship-gauntlet'` provenance; `data` carries the assurance level
and rule identity that an editor surfaces and a code-action reads back.
`message` is the finding's WHY (title + detail).

## Properties

### code

> `readonly` **code**: `string`

Defined in: [mcp-server/src/lsp/types.ts:105](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/types.ts#L105)

***

### data

> `readonly` **data**: `object`

Defined in: [mcp-server/src/lsp/types.ts:109](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/types.ts#L109)

Rigor metadata round-tripped to the code-action layer: assurance level + ruleId.

#### level

> `readonly` **level**: [`FindingLevel`](../type-aliases/FindingLevel.md)

#### ruleId

> `readonly` **ruleId**: `string`

***

### message

> `readonly` **message**: `string`

Defined in: [mcp-server/src/lsp/types.ts:107](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/types.ts#L107)

***

### range

> `readonly` **range**: [`LspRange`](LspRange.md)

Defined in: [mcp-server/src/lsp/types.ts:103](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/types.ts#L103)

***

### severity

> `readonly` **severity**: [`LspDiagnosticSeverity`](../type-aliases/LspDiagnosticSeverity.md)

Defined in: [mcp-server/src/lsp/types.ts:104](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/types.ts#L104)

***

### source

> `readonly` **source**: `string`

Defined in: [mcp-server/src/lsp/types.ts:106](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/types.ts#L106)
