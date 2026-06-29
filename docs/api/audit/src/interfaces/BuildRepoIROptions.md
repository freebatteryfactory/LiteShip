[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / BuildRepoIROptions

# Interface: BuildRepoIROptions

Defined in: [audit/src/repo-ir-build.ts:112](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/repo-ir-build.ts#L112)

Options for [buildRepoIR](../functions/buildRepoIR.md) — the host-injection surface.

## Properties

### extraFactOracles?

> `readonly` `optional` **extraFactOracles?**: readonly [`FactOracle`](../type-aliases/FactOracle.md)[]

Defined in: [audit/src/repo-ir-build.ts:118](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/repo-ir-build.ts#L118)

Host-supplied extra oracles (e.g. the LiteShip `invariant-regex` oracle the
CLI injects). Each is invoked per source file and its facts merged into the
IR. Empty/omitted → audit emits ONLY its own structural AST facts.

***

### withSymbolReferences?

> `readonly` `optional` **withSymbolReferences?**: `boolean`

Defined in: [audit/src/repo-ir-build.ts:128](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/repo-ir-build.ts#L128)

Run the SYMBOL-EVIDENCED LanguageService oracle (B3.3) — true cross-file
symbol references via a `ts.LanguageService`, cross-checked against the
file-proxy-only `refs` graph by the symbol-orphan divergence gate. OFF by
default: it is the heaviest oracle in the set (a whole-repo LanguageService +
a reference query per exported symbol), so it is opt-in (`czap check --ir
--symbols`) and amortized by the B2 verdict cache. Without it, the gate finds
nothing (no symbol-evidenced facts) — harmless.
