[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / resolveFrameMark

# Function: resolveFrameMark()

> **resolveFrameMark**(`mark`, `ctx`): `number`

Defined in: [scene/src/sugar/beat.ts:52](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/sugar/beat.ts#L52)

Resolve any [FrameMark](../type-aliases/FrameMark.md) to a numeric frame index. Numbers pass
through unchanged; beat handles resolve via [resolveBeat](resolveBeat.md);
deferred sums resolve as `frames + resolveBeat(beats)`.

## Parameters

### mark

`FrameMark`

### ctx

#### bpm

`number`

#### fps

`number`

## Returns

`number`
