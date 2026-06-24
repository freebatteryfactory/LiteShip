[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [mcp-server/src](../README.md) / projectFinding

# Function: projectFinding()

> **projectFinding**(`finding`): \{ `diagnostic`: [`LspDiagnostic`](../interfaces/LspDiagnostic.md); `uri`: `string`; \} \| `null`

Defined in: [mcp-server/src/lsp/diagnostic.ts:106](https://github.com/heyoub/LiteShip/blob/main/packages/mcp-server/src/lsp/diagnostic.ts#L106)

Project a single Finding to an LSP Diagnostic, or `null` when the finding has
no source `location` (a Diagnostic must be anchored to a document range — an
unanchored finding is surfaced through the MCP/CLI skins instead).

PURE: no I/O, no clock, no host. Same finding → same diagnostic.

## Parameters

### finding

[`FindingLike`](../interfaces/FindingLike.md)

## Returns

\{ `diagnostic`: [`LspDiagnostic`](../interfaces/LspDiagnostic.md); `uri`: `string`; \} \| `null`
