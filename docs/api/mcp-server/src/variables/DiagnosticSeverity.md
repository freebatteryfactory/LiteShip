[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [mcp-server/src](../README.md) / DiagnosticSeverity

# Variable: DiagnosticSeverity

> `const` **DiagnosticSeverity**: `object`

Defined in: [mcp-server/src/lsp/types.ts:97](https://github.com/heyoub/LiteShip/blob/main/packages/mcp-server/src/lsp/types.ts#L97)

LSP `DiagnosticSeverity` (§Diagnostic). The rigor mapping (documented on
[severityToDiagnostic](../functions/severityToDiagnostic.md)): `error` → Error(1), `warning` → Warning(2),
`advisory` → Information(3) — advisory is the authority ratchet's calibrating
tier (a real, surfaced finding that does NOT block), which `Information` (a
visible, non-actionable-yet notice) models more honestly than `Hint(4)`
(which editors fold away behind a fade).

## Type Declaration

### Error

> `readonly` **Error**: `1` = `1`

### Hint

> `readonly` **Hint**: `4` = `4`

### Information

> `readonly` **Information**: `3` = `3`

### Warning

> `readonly` **Warning**: `2` = `2`
