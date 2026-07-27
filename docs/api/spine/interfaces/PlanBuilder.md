[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / PlanBuilder

# Interface: PlanBuilder

Defined in: [\_spine/core.d.ts:1460](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1460)

Fluent builder that emits an immutable plan IR.

## Methods

### build()

> **build**(): [`PlanIR`](PlanIR.md)

Defined in: [\_spine/core.d.ts:1465](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1465)

#### Returns

[`PlanIR`](PlanIR.md)

***

### choice()

> **choice**(`fromId`, `thenId`, `elseId`): `PlanBuilder`

Defined in: [\_spine/core.d.ts:1464](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1464)

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

Defined in: [\_spine/core.d.ts:1463](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1463)

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

Defined in: [\_spine/core.d.ts:1462](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1462)

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

Defined in: [\_spine/core.d.ts:1461](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1461)

#### Parameters

##### name

`string`

##### opType

[`OpType`](../type-aliases/OpType.md)

##### metadata?

`Record`\<`string`, `unknown`\>

#### Returns

`PlanBuilder`
