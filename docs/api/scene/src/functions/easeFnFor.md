[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / easeFnFor

# Function: easeFnFor()

> **easeFnFor**(`tag`): [`EaseFn`](../type-aliases/EaseFn.md)

Defined in: [scene/src/sugar/ease.ts:66](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/sugar/ease.ts#L66)

Resolve a serializable [EaseTag](../type-aliases/EaseTag.md) to its easing function.
Tags are closed, so the lookup is total: the three names map to
their catalog entries and `{ stepped: n }` builds the step quantizer.

## Parameters

### tag

`EaseTag`

## Returns

[`EaseFn`](../type-aliases/EaseFn.md)
