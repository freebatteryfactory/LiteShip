[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / ConstraintTrace

# Interface: ConstraintTrace

Defined in: [core/src/authoring/adaptive.ts:119](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L119)

One threshold's contribution to the evaluated state — the per-threshold row of
[AdaptiveExplanation.boundary.matched](AdaptiveExplanation.md#boundary). `state` is the state a value
enters AT or ABOVE `threshold` (`boundary.states[index]`, since `threshold`
is that state's lower bound), and `satisfied` is `value >= threshold`.

## Properties

### index

> `readonly` **index**: `number`

Defined in: [core/src/authoring/adaptive.ts:121](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L121)

Index of the threshold in `boundary.thresholds`.

***

### satisfied

> `readonly` **satisfied**: `boolean`

Defined in: [core/src/authoring/adaptive.ts:127](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L127)

Whether the evaluated value clears this threshold (`value >= threshold`).

***

### state

> `readonly` **state**: `string`

Defined in: [core/src/authoring/adaptive.ts:125](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L125)

The state entered at or above this threshold (`boundary.states[index]`).

***

### threshold

> `readonly` **threshold**: `number`

Defined in: [core/src/authoring/adaptive.ts:123](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L123)

The numeric threshold value.
