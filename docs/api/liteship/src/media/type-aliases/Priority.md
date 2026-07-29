[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/media](../README.md) / Priority

# Type Alias: Priority

> **Priority** = `"critical"` \| `"high"` \| `"low"` \| `"idle"`

Defined in: core/dist/media/frame-budget.d.ts:23

Frame-budget priority lane in descending urgency. `critical` always runs;
`high` / `low` / `idle` gate based on the milliseconds remaining in the
current frame.
