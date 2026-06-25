[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / surfaceElementKey

# Function: surfaceElementKey()

> **surfaceElementKey**(`el`): `string`

Defined in: [gauntlet/src/standards-facts.ts:258](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/standards-facts.ts#L258)

The STABLE IDENTITY of a surface element — the key the diff matches on (so a
change to an element's value is seen as a MODIFY, not an add+remove). Pure +
deterministic; the same element always yields the same key. A gate's key is
namespaced by its SET (the same ruleId in two sets is two elements — dropping it
from one set is a real weaken).

## Parameters

### el

[`StandardsElement`](../type-aliases/StandardsElement.md)

## Returns

`string`
