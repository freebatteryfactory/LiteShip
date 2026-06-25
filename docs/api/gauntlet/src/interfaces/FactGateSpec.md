[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / FactGateSpec

# Interface: FactGateSpec

Defined in: [gauntlet/src/gate.ts:519](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L519)

The author surface of a [FactGate](FactGate.md) — context-free by construction (no `run`).

## Properties

### coverage?

> `readonly` `optional` **coverage?**: (`ir`) => readonly `string`[]

Defined in: [gauntlet/src/gate.ts:523](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L523)

#### Parameters

##### ir

[`RepoIR`](RepoIR.md)

#### Returns

readonly `string`[]

***

### decide

> `readonly` **decide**: (`facts`) => readonly [`Finding`](Finding.md)[]

Defined in: [gauntlet/src/gate.ts:527](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L527)

The bounded, data-only decision — no [GateContext](GateContext.md) parameter, by design.

#### Parameters

##### facts

[`FactBundle`](FactBundle.md)

#### Returns

readonly [`Finding`](Finding.md)[]

***

### describe

> `readonly` **describe**: `string`

Defined in: [gauntlet/src/gate.ts:522](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L522)

***

### fixtures

> `readonly` **fixtures**: [`GateFixtures`](GateFixtures.md)

Defined in: [gauntlet/src/gate.ts:528](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L528)

***

### id

> `readonly` **id**: `string`

Defined in: [gauntlet/src/gate.ts:520](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L520)

***

### level

> `readonly` **level**: [`AssuranceLevel`](../type-aliases/AssuranceLevel.md)

Defined in: [gauntlet/src/gate.ts:521](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L521)

***

### requires

> `readonly` **requires**: readonly `"skipSites"`[]

Defined in: [gauntlet/src/gate.ts:525](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L525)

The fact channels the decision consumes (≥1). Folded into the cache key.
