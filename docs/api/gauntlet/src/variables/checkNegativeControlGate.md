[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / checkNegativeControlGate

# Variable: checkNegativeControlGate

> `const` **checkNegativeControlGate**: [`FactGate`](../interfaces/FactGate.md)

Defined in: [gauntlet/src/gates/check-negative-control.ts:113](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/check-negative-control.ts#L113)

The check-negative-control gate — the negative-control existence backstop. Self-proves
via synthetic rows; a host injects each blocking check's declared path + on-disk existence.
