[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/motion](../README.md) / lowerScrollTimelineIntent

# Function: lowerScrollTimelineIntent()

> **lowerScrollTimelineIntent**(`intent`): [`LoweredScrollTimeline`](../interfaces/LoweredScrollTimeline.md)

Defined in: core/dist/motion/scroll-timeline.d.ts:45

Lower a [ScrollTimelineIntent](../interfaces/ScrollTimelineIntent.md) into real DocumentGraph node families.

The signal always maps to a scroll axis; CSS compilation uses
`animation-timeline: scroll()` with the authored `range`.

## Parameters

### intent

[`ScrollTimelineIntent`](../interfaces/ScrollTimelineIntent.md)

## Returns

[`LoweredScrollTimeline`](../interfaces/LoweredScrollTimeline.md)
