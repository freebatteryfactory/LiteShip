[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / GateOutcome

# Interface: GateOutcome

Defined in: [gauntlet/src/engine.ts:27](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/engine.ts#L27)

A gate's outcome within a run: its proof, earned authority, and findings.

## Properties

### authority

> `readonly` **authority**: [`Authority`](../type-aliases/Authority.md)

Defined in: [gauntlet/src/engine.ts:30](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/engine.ts#L30)

***

### findings

> `readonly` **findings**: readonly [`Finding`](Finding.md)[]

Defined in: [gauntlet/src/engine.ts:32](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/engine.ts#L32)

Findings KEPT (post-waiver), with authority already applied to severity.

***

### gateId

> `readonly` **gateId**: `string`

Defined in: [gauntlet/src/engine.ts:28](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/engine.ts#L28)

***

### proof

> `readonly` **proof**: [`GateProof`](GateProof.md)

Defined in: [gauntlet/src/engine.ts:29](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/engine.ts#L29)

***

### waived

> `readonly` **waived**: readonly [`Finding`](Finding.md)[]

Defined in: [gauntlet/src/engine.ts:34](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/engine.ts#L34)

Findings a valid waiver suppressed for this gate (audit trail).

***

### waiverFindings

> `readonly` **waiverFindings**: readonly [`Finding`](Finding.md)[]

Defined in: [gauntlet/src/engine.ts:36](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/engine.ts#L36)

Findings ABOUT this gate's waivers (expired / stale / forbidden).
