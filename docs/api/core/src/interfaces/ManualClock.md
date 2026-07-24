[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / ManualClock

# Interface: ManualClock

Defined in: [core/src/clock/clock.ts:89](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/clock/clock.ts#L89)

A [Clock](Clock.md) whose time the caller advances explicitly — deterministic.

## Extends

- [`Clock`](Clock.md)

## Properties

### advance

> `readonly` **advance**: (`byMs`) => `void`

Defined in: [core/src/clock/clock.ts:91](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/clock/clock.ts#L91)

Advance the clock by `byMs` milliseconds.

#### Parameters

##### byMs

`number`

#### Returns

`void`

***

### now

> `readonly` **now**: () => `number`

Defined in: [core/src/clock/clock.ts:43](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/clock/clock.ts#L43)

Current time in milliseconds.

#### Returns

`number`

#### Inherited from

[`Clock`](Clock.md).[`now`](Clock.md#now)

***

### set

> `readonly` **set**: (`ms`) => `void`

Defined in: [core/src/clock/clock.ts:93](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/clock/clock.ts#L93)

Set the clock to an absolute `ms`.

#### Parameters

##### ms

`number`

#### Returns

`void`
