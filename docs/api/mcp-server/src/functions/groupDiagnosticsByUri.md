[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [mcp-server/src](../README.md) / groupDiagnosticsByUri

# Function: groupDiagnosticsByUri()

> **groupDiagnosticsByUri**(`findings`, `workspaceRootUri?`): readonly `object`[]

Defined in: [mcp-server/src/lsp/diagnostic.ts:136](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/diagnostic.ts#L136)

Group a flat finding list into `PublishDiagnosticsParams`-shaped buckets keyed
by file URI. Findings with no location are dropped (they cannot anchor to a
document). The grouping is DETERMINISTIC: URIs sort lexically, diagnostics
within a URI keep finding order — so two equal finding lists publish
byte-identical params (content-addressable, replayable).

PURE: a fold over the findings, no I/O.

## Parameters

### findings

readonly [`FindingLike`](../interfaces/FindingLike.md)[]

### workspaceRootUri?

`string`

## Returns

readonly `object`[]
