[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / RuntimeWritePlan

# Interface: RuntimeWritePlan

Defined in: [\_spine/core.d.ts:1190](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1190)

Deterministic sequence of runtime property-write windows.

## Properties

### durationMs

> `readonly` **durationMs**: `number`

Defined in: [\_spine/core.d.ts:1192](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1192)

***

### easing

> `readonly` **easing**: [`RuntimeEasing`](RuntimeEasing.md)

Defined in: [\_spine/core.d.ts:1196](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1196)

***

### fromState

> `readonly` **fromState**: [`StateName`](../type-aliases/StateName.md)

Defined in: [\_spine/core.d.ts:1194](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1194)

***

### properties

> `readonly` **properties**: readonly [`RuntimeWriteProperty`](RuntimeWriteProperty.md)[]

Defined in: [\_spine/core.d.ts:1191](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1191)

***

### routing

> `readonly` **routing**: [`EdgeType`](../type-aliases/EdgeType.md)

Defined in: [\_spine/core.d.ts:1193](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1193)

***

### toState

> `readonly` **toState**: [`StateName`](../type-aliases/StateName.md)

Defined in: [\_spine/core.d.ts:1195](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1195)

***

### windows?

> `readonly` `optional` **windows?**: readonly [`RuntimeWriteWindow`](RuntimeWriteWindow.md)[]

Defined in: [\_spine/core.d.ts:1197](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1197)
