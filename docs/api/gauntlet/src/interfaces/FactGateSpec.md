[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / FactGateSpec

# Interface: FactGateSpec

Defined in: [gauntlet/src/gate.ts:513](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L513)

The author surface of a [FactGate](FactGate.md) — context-free by construction (no `run`).

## Properties

### coverage?

> `readonly` `optional` **coverage?**: (`ir`) => readonly `string`[]

Defined in: [gauntlet/src/gate.ts:517](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L517)

#### Parameters

##### ir

[`RepoIR`](RepoIR.md)

#### Returns

readonly `string`[]

***

### decide

> `readonly` **decide**: (`facts`) => readonly [`Finding`](Finding.md)[]

Defined in: [gauntlet/src/gate.ts:521](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L521)

The bounded, data-only decision — no [GateContext](GateContext.md) parameter, by design.

#### Parameters

##### facts

[`FactBundle`](FactBundle.md)

#### Returns

readonly [`Finding`](Finding.md)[]

***

### describe

> `readonly` **describe**: `string`

Defined in: [gauntlet/src/gate.ts:516](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L516)

***

### fixtures

> `readonly` **fixtures**: [`GateFixtures`](GateFixtures.md)

Defined in: [gauntlet/src/gate.ts:522](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L522)

***

### id

> `readonly` **id**: `string`

Defined in: [gauntlet/src/gate.ts:514](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L514)

***

### level

> `readonly` **level**: [`AssuranceLevel`](../type-aliases/AssuranceLevel.md)

Defined in: [gauntlet/src/gate.ts:515](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L515)

***

### requires

> `readonly` **requires**: readonly `"skipSites"`[]

Defined in: [gauntlet/src/gate.ts:519](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L519)

The fact channels the decision consumes (≥1). Folded into the cache key.
