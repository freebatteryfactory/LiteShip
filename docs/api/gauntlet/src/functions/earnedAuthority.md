[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / earnedAuthority

# Function: earnedAuthority()

> **earnedAuthority**(`proof`): [`Authority`](../type-aliases/Authority.md)

Defined in: [gauntlet/src/authority.ts:73](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/authority.ts#L73)

The ratchet decision for a gate's SEMANTIC findings: a self-proven gate earns
`blocking`; anything else is `advisory`. The engine still fails closed on the
distinct authority-integrity defect, so this demotion can never turn broken
qualification into a green run. Finding loudness is modeled independently by
`Severity`; authority has only the two behaviors the engine can execute: block
or do not block. Any future promotion history belongs in proof receipts, not
as an unreachable third release behavior.

## Parameters

### proof

[`GateProof`](../interfaces/GateProof.md)

## Returns

[`Authority`](../type-aliases/Authority.md)
