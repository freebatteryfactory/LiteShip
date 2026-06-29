[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / detectSkipsAST

# Function: detectSkipsAST()

> **detectSkipsAST**(`source`): readonly `SkipMatch`[]

Defined in: [audit/src/skip-detect-ast.ts:112](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/skip-detect-ast.ts#L112)

THE PUBLIC ENTRY — parse `source` with `ts.createSourceFile`, resolve the local runner bindings,
then walk the tree for EVERY skip/disable form, each carrying its 1-based line + the structural
`conditional` classification. Drop-in for the token `detectSkips` (same `SkipMatch`
shape), extended with `conditional`. PURE — no I/O, no `ts.Program`, no checker.

The file is parsed as `.tsx` with full JS support so type annotations (`const t: typeof it = it`),
JSX, and every modern syntax parse without a config. Parse errors do not throw (a malformed file
still yields a best-effort partial tree — the recovery parser); a structurally-broken file simply
surfaces fewer matches, never a crash.

## Parameters

### source

`string`

## Returns

readonly `SkipMatch`[]
