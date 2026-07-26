[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / GateOutcome

# Interface: GateOutcome

Defined in: [gauntlet/src/engine.ts:28](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/engine.ts#L28)

A gate's outcome within a run: its proof, earned authority, and findings.

## Properties

### authority

> `readonly` **authority**: [`Authority`](../type-aliases/Authority.md)

Defined in: [gauntlet/src/engine.ts:31](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/engine.ts#L31)

***

### findings

> `readonly` **findings**: readonly [`Finding`](Finding.md)[]

Defined in: [gauntlet/src/engine.ts:33](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/engine.ts#L33)

Findings KEPT (post-waiver), with authority already applied to severity.

***

### gateId

> `readonly` **gateId**: `string`

Defined in: [gauntlet/src/engine.ts:29](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/engine.ts#L29)

***

### proof

> `readonly` **proof**: [`GateProof`](GateProof.md)

Defined in: [gauntlet/src/engine.ts:30](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/engine.ts#L30)

***

### waived

> `readonly` **waived**: readonly [`Finding`](Finding.md)[]

Defined in: [gauntlet/src/engine.ts:35](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/engine.ts#L35)

Findings a valid waiver suppressed for this gate (audit trail).

***

### waiverFindings

> `readonly` **waiverFindings**: readonly [`Finding`](Finding.md)[]

Defined in: [gauntlet/src/engine.ts:37](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/engine.ts#L37)

Findings ABOUT this gate's waivers (expired / stale / forbidden).
