[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [core/src](../README.md) / decodeDiscreteStateTransition

# Function: decodeDiscreteStateTransition()

> **decodeDiscreteStateTransition**(`value`): [`DiscreteStateTransition`](../interfaces/DiscreteStateTransition.md)

Defined in: [core/src/motion/state-transition.ts:184](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/state-transition.ts#L184)

VERSION-AWARE, FAIL-CLOSED reader for an UNTRUSTED transition value (lowered
from an SSE frame / persisted JSON). Mirrors `GraphPatch.decode`: gates
`_tag`/`_version`/`kind` and rejects with ONE canonical tagged `ParseError`
— never silently misparsed. Scope is intentionally the tag/version/kind
ENVELOPE (the receipt hash + subject law are checked by the attestation seam).

## Parameters

### value

`unknown`

## Returns

[`DiscreteStateTransition`](../interfaces/DiscreteStateTransition.md)

## Throws

`ParseError` (`source: 'DiscreteStateTransition'`) when the value is
  not a record, carries the wrong `_tag`, an unsupported `_version`, or a
  `kind` other than `'discrete'`.
