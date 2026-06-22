[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / symbolReferenceOracle

# Function: symbolReferenceOracle()

> **symbolReferenceOracle**(`input?`): readonly [`Fact`](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts)[]

Defined in: [audit/src/repo-ir-language-service.ts:246](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/repo-ir-language-service.ts#L246)

The SYMBOL-EVIDENCED reference oracle. Builds a [ts.LanguageService](https://github.com/microsoft/TypeScript/wiki/Using-the-Language-Service-API) over
the profile's source corpus and, for each exported symbol, resolves its TRUE
cross-file references via `getReferencesAtPosition`. Emits a `symbol-orphan`
fact (boolean, structured [OrphanValue](../interfaces/OrphanValue.md) payload) and a paired
`symbol-reference-count` fact (number) per exported symbol, both tagged
`oracleId: 'ts-language-service'`, `coverageClass: 'symbol-evidenced'`, and
located at the declaration `(file, line)`.

Pure + deterministic: same source bytes → identical, sorted facts. Throws a
tagged [InvariantViolationError](https://github.com/heyoub/LiteShip/blob/main/packages/error/src/variants.ts) (never a bare throw, never a silent
catch) when the corpus is non-empty yet the LanguageService cannot construct a
program — a genuinely unresolvable program is a hard fault, not a silent zero.

## Parameters

### input?

[`SymbolReferenceOracleInput`](../interfaces/SymbolReferenceOracleInput.md) = `{}`

The profile seam — pass the SAME `DevopsProfile` handed to
  `buildRepoIR` so the facts land on the IR's file nodes.

## Returns

readonly [`Fact`](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts)[]
