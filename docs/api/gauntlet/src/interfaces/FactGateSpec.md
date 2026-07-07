[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / FactGateSpec

# Interface: FactGateSpec

Defined in: [gauntlet/src/gate.ts:645](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L645)

The author surface of a [FactGate](FactGate.md) — context-free by construction (no `run`).

## Properties

### coverage?

> `readonly` `optional` **coverage?**: (`ir`) => readonly `string`[]

Defined in: [gauntlet/src/gate.ts:649](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L649)

#### Parameters

##### ir

[`RepoIR`](RepoIR.md)

#### Returns

readonly `string`[]

***

### decide

> `readonly` **decide**: (`facts`) => readonly [`Finding`](Finding.md)[]

Defined in: [gauntlet/src/gate.ts:653](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L653)

The bounded, data-only decision — no [GateContext](GateContext.md) parameter, by design.

#### Parameters

##### facts

[`FactBundle`](FactBundle.md)

#### Returns

readonly [`Finding`](Finding.md)[]

***

### describe

> `readonly` **describe**: `string`

Defined in: [gauntlet/src/gate.ts:648](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L648)

***

### fixtures

> `readonly` **fixtures**: [`GateFixtures`](GateFixtures.md)

Defined in: [gauntlet/src/gate.ts:654](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L654)

***

### id

> `readonly` **id**: `string`

Defined in: [gauntlet/src/gate.ts:646](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L646)

***

### level

> `readonly` **level**: [`AssuranceLevel`](../type-aliases/AssuranceLevel.md)

Defined in: [gauntlet/src/gate.ts:647](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L647)

***

### requires

> `readonly` **requires**: readonly (`"skipSites"` \| `"activeSurfaceFacts"`)[]

Defined in: [gauntlet/src/gate.ts:651](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L651)

The fact channels the decision consumes (≥1). Folded into the cache key.
