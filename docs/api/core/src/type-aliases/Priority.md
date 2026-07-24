[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / Priority

# Type Alias: Priority

> **Priority** = `"critical"` \| `"high"` \| `"low"` \| `"idle"`

Defined in: [core/src/media/frame-budget.ts:27](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/media/frame-budget.ts#L27)

Frame-budget priority lane in descending urgency. `critical` always runs;
`high` / `low` / `idle` gate based on the milliseconds remaining in the
current frame.
