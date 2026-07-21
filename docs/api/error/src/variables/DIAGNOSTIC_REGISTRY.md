[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [error/src](../README.md) / DIAGNOSTIC\_REGISTRY

# Variable: DIAGNOSTIC\_REGISTRY

> `const` **DIAGNOSTIC\_REGISTRY**: `Readonly`\<`Record`\<[`DiagnosticCode`](../type-aliases/DiagnosticCode.md), [`DiagnosticEntry`](../interfaces/DiagnosticEntry.md)\>\>

Defined in: [error/src/codes.ts:92](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/codes.ts#L92)

THE REGISTRY — one entry per stable diagnostic code. Frozen; the keys are the
codes VERBATIM as their emitters produce them (a gauntlet ruleId literal, a
`check/<slug>` id, an `@liteship/core` diagnostic code). The `gauntlet/*` and
`check/*` keys are the ones the `gauntlet/diagnostic-code-registered` gate
statically proves are enrolled.
