[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [mcp-server/src](../README.md) / severityToDiagnostic

# Function: severityToDiagnostic()

> **severityToDiagnostic**(`severity`): [`LspDiagnosticSeverity`](../type-aliases/LspDiagnosticSeverity.md)

Defined in: [mcp-server/src/lsp/diagnostic.ts:61](https://github.com/heyoub/LiteShip/blob/main/packages/mcp-server/src/lsp/diagnostic.ts#L61)

Map a finding severity to its LSP diagnostic severity.
 - `error` → Error(1): blocks; the loudest.
 - `warning` → Warning(2): tracked-but-tolerated.
 - `advisory` → Information(3): the authority ratchet's calibrating tier — a
   real finding that does NOT yet block. `Information` (a visible notice)
   models "surfaced but non-blocking" more honestly than `Hint(4)` (which
   editors fade away). The mapping is total over the three-member union.

## Parameters

### severity

[`FindingSeverity`](../type-aliases/FindingSeverity.md)

## Returns

[`LspDiagnosticSeverity`](../type-aliases/LspDiagnosticSeverity.md)
