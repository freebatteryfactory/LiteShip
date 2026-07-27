[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / compileScrollTimeline

# Function: compileScrollTimeline()

> **compileScrollTimeline**(`graph`, `transitionId`, `intent`, `opts?`): [`CompiledScrollTimeline`](../interfaces/CompiledScrollTimeline.md)

Defined in: [compiler/src/scroll-timeline-compile.ts:91](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/scroll-timeline-compile.ts#L91)

Compile a lowered scroll-timeline graph into native CSS + a runtime write plan.

## Parameters

### graph

[`DocumentGraph`](../../../liteship/src/graph/interfaces/DocumentGraph.md)

### transitionId

[`ContentAddress`](../../../spine/type-aliases/ContentAddress.md)

### intent

[`ScrollTimelineIntent`](../../../liteship/src/motion/interfaces/ScrollTimelineIntent.md)

### opts?

#### prefersReducedMotion?

`boolean`

## Returns

[`CompiledScrollTimeline`](../interfaces/CompiledScrollTimeline.md)
