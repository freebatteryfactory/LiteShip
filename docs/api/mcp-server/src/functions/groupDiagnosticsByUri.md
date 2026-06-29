[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [mcp-server/src](../README.md) / groupDiagnosticsByUri

# Function: groupDiagnosticsByUri()

> **groupDiagnosticsByUri**(`findings`): readonly `object`[]

Defined in: [mcp-server/src/lsp/diagnostic.ts:131](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/diagnostic.ts#L131)

Group a flat finding list into `PublishDiagnosticsParams`-shaped buckets keyed
by file URI. Findings with no location are dropped (they cannot anchor to a
document). The grouping is DETERMINISTIC: URIs sort lexically, diagnostics
within a URI keep finding order — so two equal finding lists publish
byte-identical params (content-addressable, replayable).

PURE: a fold over the findings, no I/O.

## Parameters

### findings

readonly [`FindingLike`](../interfaces/FindingLike.md)[]

## Returns

readonly `object`[]
