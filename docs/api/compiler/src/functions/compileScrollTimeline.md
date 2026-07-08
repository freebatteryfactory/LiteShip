[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / compileScrollTimeline

# Function: compileScrollTimeline()

> **compileScrollTimeline**(`graph`, `transitionId`, `intent`): [`CompiledScrollTimeline`](../interfaces/CompiledScrollTimeline.md)

Defined in: [compiler/src/scroll-timeline-compile.ts:91](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/scroll-timeline-compile.ts#L91)

Compile a lowered scroll-timeline graph into native CSS + a runtime write plan.

## Parameters

### graph

[`DocumentGraph`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts)

### transitionId

`ContentAddress`

### intent

`ScrollTimelineIntent`

## Returns

[`CompiledScrollTimeline`](../interfaces/CompiledScrollTimeline.md)
