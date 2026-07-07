[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / compileReveal

# Function: compileReveal()

> **compileReveal**(`graph`, `transitionId`, `intent`): [`CompiledReveal`](../interfaces/CompiledReveal.md)

Defined in: [compiler/src/reveal-compile.ts:69](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/reveal-compile.ts#L69)

Compile a lowered reveal graph into native CSS + a runtime write plan.

Reads `TransitionNode.routing` / `durationMs` via `interpretTransition`
and emits `@property`, `@keyframes`, `@starting-style`, and state-keyed
transitions through [MotionCompiler](../variables/MotionCompiler.md).

## Parameters

### graph

[`DocumentGraph`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts)

### transitionId

`ContentAddress`

### intent

`RevealIntent`

## Returns

[`CompiledReveal`](../interfaces/CompiledReveal.md)
