[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / lowerScrollTimelineIntent

# Function: lowerScrollTimelineIntent()

> **lowerScrollTimelineIntent**(`intent`): [`LoweredScrollTimeline`](../interfaces/LoweredScrollTimeline.md)

Defined in: [core/src/scroll-timeline.ts:130](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/scroll-timeline.ts#L130)

Lower a [ScrollTimelineIntent](../interfaces/ScrollTimelineIntent.md) into real DocumentGraph node families.

The signal always maps to a scroll axis; CSS compilation uses
`animation-timeline: scroll()` with the authored `range`.

## Parameters

### intent

[`ScrollTimelineIntent`](../interfaces/ScrollTimelineIntent.md)

## Returns

[`LoweredScrollTimeline`](../interfaces/LoweredScrollTimeline.md)
