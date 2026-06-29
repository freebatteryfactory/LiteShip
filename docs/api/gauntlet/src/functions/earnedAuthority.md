[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / earnedAuthority

# Function: earnedAuthority()

> **earnedAuthority**(`proof`): [`Authority`](../type-aliases/Authority.md)

Defined in: [gauntlet/src/authority.ts:69](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/authority.ts#L69)

The ratchet decision: a self-proven gate earns `blocking`; anything else is
`advisory` (it surfaces findings but cannot fail the run). The
advisory→warning→blocking promotion over N low-false-positive runs is a
calibration layer that sits ON TOP of this floor — but the floor is absolute:
an unproven gate never blocks.

## Parameters

### proof

[`GateProof`](../interfaces/GateProof.md)

## Returns

[`Authority`](../type-aliases/Authority.md)
