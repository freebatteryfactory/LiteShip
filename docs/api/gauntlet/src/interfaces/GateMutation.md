[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [gauntlet/src](../README.md) / GateMutation

# Interface: GateMutation

Defined in: [gauntlet/src/gate.ts:551](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L551)

A mutation of a gate's own logic + the reason it should be caught.

## Properties

### describe

> `readonly` **describe**: `string`

Defined in: [gauntlet/src/gate.ts:552](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L552)

***

### mutate

> `readonly` **mutate**: (`gate`) => [`Gate`](Gate.md)

Defined in: [gauntlet/src/gate.ts:554](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L554)

Return a gate whose `run` is a plausible-but-wrong variant of the original.

#### Parameters

##### gate

[`Gate`](Gate.md)

#### Returns

[`Gate`](Gate.md)
