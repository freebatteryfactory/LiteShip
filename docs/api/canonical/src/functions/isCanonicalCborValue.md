[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [canonical/src](../README.md) / isCanonicalCborValue

# Function: isCanonicalCborValue()

> **isCanonicalCborValue**(`value`): `value is CanonicalCborValue`

Defined in: [canonical/src/value-domain.ts:45](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/canonical/src/value-domain.ts#L45)

Admit the complete portable value graph without invoking authored getters.

The walk is cycle-aware. It deliberately treats array holes as `undefined`
because the encoder projects both to canonical `null` array members.

## Parameters

### value

`unknown`

## Returns

`value is CanonicalCborValue`
