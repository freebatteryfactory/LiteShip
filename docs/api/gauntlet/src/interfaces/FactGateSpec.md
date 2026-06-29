[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / FactGateSpec

# Interface: FactGateSpec

Defined in: [gauntlet/src/gate.ts:580](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L580)

The author surface of a [FactGate](FactGate.md) — context-free by construction (no `run`).

## Properties

### coverage?

> `readonly` `optional` **coverage?**: (`ir`) => readonly `string`[]

Defined in: [gauntlet/src/gate.ts:584](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L584)

#### Parameters

##### ir

[`RepoIR`](RepoIR.md)

#### Returns

readonly `string`[]

***

### decide

> `readonly` **decide**: (`facts`) => readonly [`Finding`](Finding.md)[]

Defined in: [gauntlet/src/gate.ts:588](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L588)

The bounded, data-only decision — no [GateContext](GateContext.md) parameter, by design.

#### Parameters

##### facts

[`FactBundle`](FactBundle.md)

#### Returns

readonly [`Finding`](Finding.md)[]

***

### describe

> `readonly` **describe**: `string`

Defined in: [gauntlet/src/gate.ts:583](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L583)

***

### fixtures

> `readonly` **fixtures**: [`GateFixtures`](GateFixtures.md)

Defined in: [gauntlet/src/gate.ts:589](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L589)

***

### id

> `readonly` **id**: `string`

Defined in: [gauntlet/src/gate.ts:581](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L581)

***

### level

> `readonly` **level**: [`AssuranceLevel`](../type-aliases/AssuranceLevel.md)

Defined in: [gauntlet/src/gate.ts:582](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L582)

***

### requires

> `readonly` **requires**: readonly `"skipSites"`[]

Defined in: [gauntlet/src/gate.ts:586](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L586)

The fact channels the decision consumes (≥1). Folded into the cache key.
