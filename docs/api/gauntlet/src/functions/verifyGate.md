[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / verifyGate

# Function: verifyGate()

> **verifyGate**(`gate`): [`GateProof`](../interfaces/GateProof.md)

Defined in: [gauntlet/src/authority.ts:43](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/authority.ts#L43)

Run a gate against its own fixtures and return the proof. Pure: it only
exercises the gate's `run` over the fixtures' in-memory contexts.

## Parameters

### gate

[`Gate`](../interfaces/Gate.md)

## Returns

[`GateProof`](../interfaces/GateProof.md)
