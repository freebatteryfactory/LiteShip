[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / GateMutation

# Interface: GateMutation

Defined in: [gauntlet/src/gate.ts:392](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L392)

A mutation of a gate's own logic + the reason it should be caught.

## Properties

### describe

> `readonly` **describe**: `string`

Defined in: [gauntlet/src/gate.ts:393](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L393)

***

### mutate

> `readonly` **mutate**: (`gate`) => [`Gate`](Gate.md)

Defined in: [gauntlet/src/gate.ts:395](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L395)

Return a gate whose `run` is a plausible-but-wrong variant of the original.

#### Parameters

##### gate

[`Gate`](Gate.md)

#### Returns

[`Gate`](Gate.md)
