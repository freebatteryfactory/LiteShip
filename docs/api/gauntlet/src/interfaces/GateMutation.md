[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / GateMutation

# Interface: GateMutation

Defined in: [gauntlet/src/gate.ts:341](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L341)

A mutation of a gate's own logic + the reason it should be caught.

## Properties

### describe

> `readonly` **describe**: `string`

Defined in: [gauntlet/src/gate.ts:342](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L342)

***

### mutate

> `readonly` **mutate**: (`gate`) => [`Gate`](Gate.md)

Defined in: [gauntlet/src/gate.ts:344](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L344)

Return a gate whose `run` is a plausible-but-wrong variant of the original.

#### Parameters

##### gate

[`Gate`](Gate.md)

#### Returns

[`Gate`](Gate.md)
