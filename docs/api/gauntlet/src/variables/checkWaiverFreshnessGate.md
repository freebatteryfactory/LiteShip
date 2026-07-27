[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / checkWaiverFreshnessGate

# Variable: checkWaiverFreshnessGate

> `const` **checkWaiverFreshnessGate**: [`FactGate`](../interfaces/FactGate.md)

Defined in: [gauntlet/src/gates/check-waiver-freshness.ts:107](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/check-waiver-freshness.ts#L107)

The check-waiver-freshness gate — the two-store expiry backstop. Self-proves via
synthetic rows; a host decides each waiver's expiry against an injected wall-clock date.
