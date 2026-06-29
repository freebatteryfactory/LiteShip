[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [mcp-server/src](../README.md) / LspGauntletRunner

# Type Alias: LspGauntletRunner

> **LspGauntletRunner** = (`globs?`) => `Promise`\<\{ `blocked`: `boolean`; `findings`: readonly [`FindingLike`](../interfaces/FindingLike.md)[]; \}\>

Defined in: [mcp-server/src/lsp/types.ts:70](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/types.ts#L70)

The injected gauntlet runner — the LSP's ONLY door to findings. Mirrors
`CommandContext.runGauntlet`: the engine fold (and its `node:fs` glob +
waiver-expiry wall-clock) lives in the CLI host, NOT in this server. The
server folds the returned findings into diagnostics; it never runs the
gauntlet itself. Returns findings grouped per the engine's flat list — the
server groups them by file URI for `publishDiagnostics`.

## Parameters

### globs?

readonly `string`[]

## Returns

`Promise`\<\{ `blocked`: `boolean`; `findings`: readonly [`FindingLike`](../interfaces/FindingLike.md)[]; \}\>
