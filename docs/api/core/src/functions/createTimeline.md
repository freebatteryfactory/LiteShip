[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / createTimeline

# Function: createTimeline()

> **createTimeline**\<`B`\>(`boundary`, `config?`): `TimelineShape`\<`B`\>

Defined in: [core/src/motion/timeline.ts:74](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/timeline.ts#L74)

Create a [Timeline](../type-aliases/Timeline.md) — scheduler-driven advancement over a
[Boundary](../variables/Boundary.md). Produces a plain reactive timeline that seeks or plays
between boundary states; pluggable clock via [Scheduler](../variables/Scheduler.md), teardown via
[Lifetime](../variables/Lifetime.md).

## Type Parameters

### B

`B` *extends* [`Boundary`](../type-aliases/Boundary.md)

## Parameters

### boundary

`B`

### config?

#### duration?

`Millis`

#### loop?

`boolean`

#### scheduler?

`SchedulerShape`

## Returns

`TimelineShape`\<`B`\>
