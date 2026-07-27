[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / FrameBudget

# Interface: FrameBudget

Defined in: [\_spine/core.d.ts:503](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L503)

Frame-time admission controller for prioritized work.

## Properties

### fpsSync

> `readonly` **fpsSync**: `number`

Defined in: [\_spine/core.d.ts:507](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L507)

***

### lifetime

> `readonly` **lifetime**: [`Lifetime`](Lifetime.md)

Defined in: [\_spine/core.d.ts:508](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L508)

## Methods

### canRun()

> **canRun**(`priority`): `boolean`

Defined in: [\_spine/core.d.ts:505](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L505)

#### Parameters

##### priority

[`Priority`](../type-aliases/Priority.md)

#### Returns

`boolean`

***

### remaining()

> **remaining**(): `number`

Defined in: [\_spine/core.d.ts:504](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L504)

#### Returns

`number`

***

### scheduleSync()

> **scheduleSync**\<`A`\>(`priority`, `task`): `A` \| `null`

Defined in: [\_spine/core.d.ts:506](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L506)

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
