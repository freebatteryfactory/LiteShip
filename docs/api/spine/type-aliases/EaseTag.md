[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / EaseTag

# Type Alias: EaseTag

> **EaseTag** = [`EaseName`](EaseName.md) \| \{ `stepped`: `number`; \}

Defined in: [\_spine/scene.d.ts:126](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/scene.d.ts#L126)

Serializable ease reference stored on a TransitionTrack and emitted
as the `Ease` ECS component. Names — not functions — keep the
compiled scene pure data (content-addressable, dense-store-safe).
`{ stepped: n }` carries the step count for the `ease.stepped(n)` factory.
