[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / PlanBuilder

# Interface: PlanBuilder

Defined in: [\_spine/core.d.ts:1245](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1245)

Fluent builder that emits an immutable plan IR.

## Methods

### build()

> **build**(): [`PlanIR`](PlanIR.md)

Defined in: [\_spine/core.d.ts:1250](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1250)

#### Returns

[`PlanIR`](PlanIR.md)

***

### choice()

> **choice**(`fromId`, `thenId`, `elseId`): `PlanBuilder`

Defined in: [\_spine/core.d.ts:1249](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1249)

#### Parameters

##### fromId

`string`

##### thenId

`string`

##### elseId

`string`

#### Returns

`PlanBuilder`

***

### par()

> **par**(`fromId`, `toId`): `PlanBuilder`

Defined in: [\_spine/core.d.ts:1248](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1248)

#### Parameters

##### fromId

`string`

##### toId

`string`

#### Returns

`PlanBuilder`

***

### seq()

> **seq**(`fromId`, `toId`): `PlanBuilder`

Defined in: [\_spine/core.d.ts:1247](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1247)

#### Parameters

##### fromId

`string`

##### toId

`string`

#### Returns

`PlanBuilder`

***

### step()

> **step**(`name`, `opType`, `metadata?`): `PlanBuilder`

Defined in: [\_spine/core.d.ts:1246](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1246)

#### Parameters

##### name

`string`

##### opType

[`OpType`](../type-aliases/OpType.md)

##### metadata?

`Record`\<`string`, `unknown`\>

#### Returns

`PlanBuilder`
