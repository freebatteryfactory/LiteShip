[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/motion](../README.md) / createTimeline

# Function: createTimeline()

> **createTimeline**\<`B`\>(`boundary`, `config?`): `TimelineShape`\<`B`\>

Defined in: core/dist/motion/timeline.d.ts:61

Create a [Timeline](../type-aliases/Timeline.md) — scheduler-driven advancement over a
[Boundary](../../type-aliases/Boundary.md). Produces a plain reactive timeline that seeks or plays
between boundary states; pluggable clock via [Scheduler](../../reactive/variables/Scheduler.md), teardown via
`Lifetime`.

## Type Parameters

### B

`B` *extends* [`Boundary`](../../type-aliases/Boundary.md)

## Parameters

### boundary

`B`

### config?

#### duration?

[`Millis`](../../../../spine/type-aliases/Millis.md)

#### loop?

`boolean`

#### scheduler?

`SchedulerShape`

## Returns

`TimelineShape`\<`B`\>
