[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / FrameBudget

# Interface: FrameBudget

Defined in: [\_spine/core.d.ts:531](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L531)

Frame-time admission controller for prioritized work.

## Properties

### fpsSync

> `readonly` **fpsSync**: `number`

Defined in: [\_spine/core.d.ts:535](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L535)

***

### lifetime

> `readonly` **lifetime**: [`Lifetime`](Lifetime.md)

Defined in: [\_spine/core.d.ts:536](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L536)

## Methods

### canRun()

> **canRun**(`priority`): `boolean`

Defined in: [\_spine/core.d.ts:533](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L533)

#### Parameters

##### priority

[`Priority`](../type-aliases/Priority.md)

#### Returns

`boolean`

***

### remaining()

> **remaining**(): `number`

Defined in: [\_spine/core.d.ts:532](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L532)

#### Returns

`number`

***

### scheduleSync()

> **scheduleSync**\<`A`\>(`priority`, `task`): `A` \| `null`

Defined in: [\_spine/core.d.ts:534](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L534)

#### Type Parameters

##### A

`A`

#### Parameters

##### priority

[`Priority`](../type-aliases/Priority.md)

##### task

() => `A`

#### Returns

`A` \| `null`
