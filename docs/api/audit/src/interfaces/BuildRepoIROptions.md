[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / BuildRepoIROptions

# Interface: BuildRepoIROptions

Defined in: [audit/src/repo-ir-build.ts:116](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/repo-ir-build.ts#L116)

Options for [buildRepoIR](../functions/buildRepoIR.md) — the host-injection surface.

## Properties

### benchmarkDistributions?

> `readonly` `optional` **benchmarkDistributions?**: readonly `unknown`[]

Defined in: [audit/src/repo-ir-build.ts:139](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/repo-ir-build.ts#L139)

Optional raw benchmark registry rows. When present, audit validates and
qualifies their measured SUT reachability into the same immutable RepoIR.

***

### extraFactOracles?

> `readonly` `optional` **extraFactOracles?**: readonly [`FactOracle`](../type-aliases/FactOracle.md)[]

Defined in: [audit/src/repo-ir-build.ts:124](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/repo-ir-build.ts#L124)

Host-supplied extra oracles (e.g. the LiteShip `invariant-regex` oracle the
CLI injects). Each is invoked per source file and its facts merged into the
IR. Empty/omitted → audit emits ONLY its own structural AST facts.

***

### typeScriptPathAliases?

> `readonly` `optional` **typeScriptPathAliases?**: `Readonly`\<`Record`\<`string`, readonly `string`[]\>\>

Defined in: [audit/src/repo-ir-build.ts:118](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/repo-ir-build.ts#L118)

Host-owned source aliases used by type-directed analysis.

***

### withSymbolReferences?

> `readonly` `optional` **withSymbolReferences?**: `boolean`

Defined in: [audit/src/repo-ir-build.ts:134](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/repo-ir-build.ts#L134)

Run the SYMBOL-EVIDENCED LanguageService oracle (B3.3) — true cross-file
symbol references via a `ts.LanguageService`, cross-checked against the
file-proxy-only `refs` graph by the symbol-orphan divergence gate. OFF by
default: it is the heaviest oracle in the set (a whole-repo LanguageService +
a reference query per exported symbol), so it is opt-in (`liteship check gates --ir
--symbols`) and amortized by the B2 verdict cache. Without it, the gate finds
nothing (no symbol-evidenced facts) — harmless.
