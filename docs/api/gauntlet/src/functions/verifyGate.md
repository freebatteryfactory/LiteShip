[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / verifyGate

# Function: verifyGate()

> **verifyGate**(`gate`, `context?`): [`GateProof`](../interfaces/GateProof.md)

Defined in: [gauntlet/src/authority.ts:103](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/authority.ts#L103)

Run a gate against its own fixtures and return the proof. Pure: it only
exercises the gate's `run` over the fixtures' in-memory contexts.

## Parameters

### gate

[`Gate`](../interfaces/Gate.md)

### context?

[`GateContext`](../interfaces/GateContext.md) = `gate.fixtures.green.context`

## Returns

[`GateProof`](../interfaces/GateProof.md)
