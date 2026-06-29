[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [mcp-server/src](../README.md) / projectRemediation

# Function: projectRemediation()

> **projectRemediation**(`remediation`, `diagnostic`, `uri`): [`LspCodeAction`](../interfaces/LspCodeAction.md) \| `null`

Defined in: [mcp-server/src/lsp/code-action.ts:54](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/code-action.ts#L54)

Project a finding's remediation to an LSP CodeAction, or `null` when the
finding carries no remediation. `diagnostic` is the projected diagnostic the
action fixes (the §CodeAction.diagnostics back-link); `uri` is the document
the patch targets (carried in the apply-patch command arguments so the client
knows WHERE to apply the diff).

PURE: no I/O, no clock, no host. Same (remediation, diagnostic, uri) → same
code action. The mapping is TOTAL over the two-member remediation union (the
`switch` has no `default` — a new remediation kind surfaces here as a
type error to handle, never a silent fall-through).

## Parameters

### remediation

[`FindingRemediationLike`](../type-aliases/FindingRemediationLike.md) \| `undefined`

### diagnostic

[`LspDiagnostic`](../interfaces/LspDiagnostic.md)

### uri

`string`

## Returns

[`LspCodeAction`](../interfaces/LspCodeAction.md) \| `null`
