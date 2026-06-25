[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / SymbolKind

# Type Alias: SymbolKind

> **SymbolKind** = `"function"` \| `"class"` \| `"const"` \| `"let"` \| `"var"` \| `"type"` \| `"interface"` \| `"enum"` \| `"namespace"` \| `"default-export"` \| `"export-assignment"` \| `"re-export"`

Defined in: [gauntlet/src/repo-ir.ts:164](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L164)

The normalized declaration kinds a symbol node carries — a closed `_tag`-style
union over the syntactic shapes the host extracts (design: ECS over the audit
`ExportedSymbol` facts). `default-export` and `export-assignment` are kept
distinct because the `no-default-export` oracle-divergence cross-check (B1)
turns on exactly that distinction (the default-export keyword form vs the
`export =` assignment form vs the `{ x as default }` re-export form). (Phrased
without the literal keyword pair so the text-only invariant scanner — which
cannot tell comment from code, the very imprecision this oracle cures — does
not flag this doc comment.)
