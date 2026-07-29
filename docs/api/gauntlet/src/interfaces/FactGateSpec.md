[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [gauntlet/src](../README.md) / FactGateSpec

# Interface: FactGateSpec

Defined in: [gauntlet/src/gate.ts:1179](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L1179)

The author surface of a [FactGate](FactGate.md) — context-free by construction (no `run`).

## Properties

### coverage?

> `readonly` `optional` **coverage?**: (`ir`) => readonly `string`[]

Defined in: [gauntlet/src/gate.ts:1185](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L1185)

#### Parameters

##### ir

[`RepoIR`](RepoIR.md)

#### Returns

readonly `string`[]

***

### decide

> `readonly` **decide**: (`facts`) => readonly [`Finding`](Finding.md)[]

Defined in: [gauntlet/src/gate.ts:1189](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L1189)

The bounded, data-only decision — no [GateContext](GateContext.md) parameter, by design.

#### Parameters

##### facts

[`FactBundle`](FactBundle.md)

#### Returns

readonly [`Finding`](Finding.md)[]

***

### describe

> `readonly` **describe**: `string`

Defined in: [gauntlet/src/gate.ts:1184](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L1184)

***

### extension?

> `readonly` `optional` **extension?**: [`ExtensionGateIdentity`](ExtensionGateIdentity.md)

Defined in: [gauntlet/src/gate.ts:1182](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L1182)

Required when `id` uses a non-LiteShip namespace; absent on built-in gates.

***

### fixtures

> `readonly` **fixtures**: [`GateFixtures`](GateFixtures.md)

Defined in: [gauntlet/src/gate.ts:1192](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L1192)

***

### id

> `readonly` **id**: `string`

Defined in: [gauntlet/src/gate.ts:1180](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L1180)

***

### level

> `readonly` **level**: [`AssuranceLevel`](../type-aliases/AssuranceLevel.md)

Defined in: [gauntlet/src/gate.ts:1183](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L1183)

***

### requires

> `readonly` **requires**: readonly (`"skipSites"` \| `"activeSurfaceFacts"` \| `"featureEdges"` \| `"checkGovernance"`)[]

Defined in: [gauntlet/src/gate.ts:1187](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L1187)

The fact channels the decision consumes (≥1). Folded into the cache key.

***

### subjectCoverage?

> `readonly` `optional` **subjectCoverage?**: (`facts`) => [`GateSubjectCoverage`](../type-aliases/GateSubjectCoverage.md)

Defined in: [gauntlet/src/gate.ts:1191](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L1191)

Data-only subject census derived from the same declared facts as `decide`.

#### Parameters

##### facts

[`FactBundle`](FactBundle.md)

#### Returns

[`GateSubjectCoverage`](../type-aliases/GateSubjectCoverage.md)
