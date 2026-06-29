[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / isGoverned

# Function: isGoverned()

> **isGoverned**(`file`): `boolean`

Defined in: [gauntlet/src/skip-site-facts.ts:74](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/skip-site-facts.ts#L74)

A `.ts` file the no-skipped-test rule judges — excludes `tests/generated/` (the plumb-gate's
tree owns that subtree's zero-skip guarantee). The producer's corpus filter; a deliberate
(trivial) twin of the closure gate's own `isGoverned`, so the shadow-diff is a TRUE
differential over the whole path, not a shared-helper blind spot.

## Parameters

### file

`string`

## Returns

`boolean`
