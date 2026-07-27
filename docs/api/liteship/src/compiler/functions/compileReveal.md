[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/compiler](../README.md) / compileReveal

# Function: compileReveal()

> **compileReveal**(`graph`, `transitionId`, `intent`): [`CompiledReveal`](../interfaces/CompiledReveal.md)

Defined in: compiler/dist/reveal-compile.d.ts:27

Compile a lowered reveal graph into native CSS + a runtime write plan.

Reads `TransitionNode.routing` / `durationMs` via `interpretTransition`
and emits `@property`, `@keyframes`, `@starting-style`, and state-keyed
transitions through [MotionCompiler](../variables/MotionCompiler.md).

## Parameters

### graph

[`DocumentGraph`](../../graph/interfaces/DocumentGraph.md)

### transitionId

[`ContentAddress`](../../../../spine/type-aliases/ContentAddress.md)

### intent

[`RevealIntent`](../../motion/interfaces/RevealIntent.md)

## Returns

[`CompiledReveal`](../interfaces/CompiledReveal.md)
