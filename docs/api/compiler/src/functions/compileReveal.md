[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [compiler/src](../README.md) / compileReveal

# Function: compileReveal()

> **compileReveal**(`graph`, `transitionId`, `intent`): [`CompiledReveal`](../interfaces/CompiledReveal.md)

Defined in: [compiler/src/reveal-compile.ts:86](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/reveal-compile.ts#L86)

Compile a lowered reveal graph into native CSS + a runtime write plan.

Reads `TransitionNode.routing` / `durationMs` via `interpretTransition`
and emits `@property`, `@keyframes`, `@starting-style`, and state-keyed
transitions through [MotionCompiler](../variables/MotionCompiler.md).

## Parameters

### graph

[`DocumentGraph`](../../../liteship/src/graph/interfaces/DocumentGraph.md)

### transitionId

[`ContentAddress`](../../../spine/type-aliases/ContentAddress.md)

### intent

[`RevealIntent`](../../../liteship/src/motion/interfaces/RevealIntent.md)

## Returns

[`CompiledReveal`](../interfaces/CompiledReveal.md)
