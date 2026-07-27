[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/compiler](../README.md) / compileScrollTimeline

# Function: compileScrollTimeline()

> **compileScrollTimeline**(`graph`, `transitionId`, `intent`, `opts?`): [`CompiledScrollTimeline`](../interfaces/CompiledScrollTimeline.md)

Defined in: compiler/dist/scroll-timeline-compile.d.ts:20

Compile a lowered scroll-timeline graph into native CSS + a runtime write plan.

## Parameters

### graph

[`DocumentGraph`](../../graph/interfaces/DocumentGraph.md)

### transitionId

[`ContentAddress`](../../../../spine/type-aliases/ContentAddress.md)

### intent

[`ScrollTimelineIntent`](../../motion/interfaces/ScrollTimelineIntent.md)

### opts?

#### prefersReducedMotion?

`boolean`

## Returns

[`CompiledScrollTimeline`](../interfaces/CompiledScrollTimeline.md)
