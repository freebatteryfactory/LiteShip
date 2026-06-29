[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / defineGate

# Function: defineGate()

> **defineGate**(`spec`): [`Gate`](../interfaces/Gate.md)

Defined in: [gauntlet/src/gate.ts:536](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L536)

Define a gate — the one constructor. Validates the spec eagerly (a gate with
an empty id, or missing any of red/green/mutation, is a malformed plugin and
throws [ValidationError](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/variants.ts) at registration, not at run time).

## Parameters

### spec

[`Gate`](../interfaces/Gate.md)

## Returns

[`Gate`](../interfaces/Gate.md)
