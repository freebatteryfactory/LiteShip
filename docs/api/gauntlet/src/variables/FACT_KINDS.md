[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / FACT\_KINDS

# Variable: FACT\_KINDS

> `const` **FACT\_KINDS**: readonly \[`"skipSites"`, `"activeSurfaceFacts"`, `"checkGovernance"`\]

Defined in: [gauntlet/src/gate.ts:505](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L505)

The runtime tuple of FactKinds a [FactGate](../interfaces/FactGate.md) may require — the SINGLE SOURCE for the
[FactKind](../type-aliases/FactKind.md) type (derived below, never re-typed) AND the runtime allowlist
[defineFactGate](../functions/defineFactGate.md) validates `requires` against (so a misspelled `'skipSite'` fails LOUD
at construction instead of silently branding a gate that folds empty facts). Each kind names a
host-produced FactPack channel — a field on [FactBundle](../interfaces/FactBundle.md) and an optional key on
[GateContext](../interfaces/GateContext.md).
