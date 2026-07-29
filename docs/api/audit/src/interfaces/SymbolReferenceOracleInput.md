[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [audit/src](../README.md) / SymbolReferenceOracleInput

# Interface: SymbolReferenceOracleInput

Defined in: [audit/src/repo-ir-language-service.ts:92](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/repo-ir-language-service.ts#L92)

Input to [symbolReferenceOracle](../functions/symbolReferenceOracle.md) — the same profile/corpus seam `buildRepoIR` uses.

## Properties

### profile?

> `readonly` `optional` **profile?**: [`DevopsProfile`](DevopsProfile.md)

Defined in: [audit/src/repo-ir-language-service.ts:98](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/repo-ir-language-service.ts#L98)

The audit profile (`profile.repoRoot` is the authoritative target). A host
should pass the SAME profile it hands `buildRepoIR`; omission uses only the
generic current-workspace defaults and inherits no project policy.

***

### typeScriptPathAliases?

> `readonly` `optional` **typeScriptPathAliases?**: `Readonly`\<`Record`\<`string`, readonly `string`[]\>\>

Defined in: [audit/src/repo-ir-language-service.ts:100](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/repo-ir-language-service.ts#L100)

Host-owned source aliases used by the TypeScript resolver.
