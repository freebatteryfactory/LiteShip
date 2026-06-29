[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / SymbolReferenceOracleInput

# Interface: SymbolReferenceOracleInput

Defined in: [audit/src/repo-ir-language-service.ts:92](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/repo-ir-language-service.ts#L92)

Input to [symbolReferenceOracle](../functions/symbolReferenceOracle.md) — the same profile/corpus seam `buildRepoIR` uses.

## Properties

### profile?

> `readonly` `optional` **profile?**: [`DevopsProfile`](DevopsProfile.md)

Defined in: [audit/src/repo-ir-language-service.ts:98](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/repo-ir-language-service.ts#L98)

The audit profile (`profile.repoRoot` is the authoritative target). Defaults
to the LiteShip reference profile — the integrator passes the SAME profile it
hands `buildRepoIR`, so the oracle's facts land on the same file nodes.
