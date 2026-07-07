[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / CompiledReveal

# Interface: CompiledReveal

Defined in: [compiler/src/reveal-compile.ts:27](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/reveal-compile.ts#L27)

Compiled reveal artifacts — CSS projection + runtime floor.

## Properties

### css

> `readonly` **css**: [`MotionCompileResult`](MotionCompileResult.md)

Defined in: [compiler/src/reveal-compile.ts:28](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/reveal-compile.ts#L28)

***

### graph

> `readonly` **graph**: [`DocumentGraph`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts)

Defined in: [compiler/src/reveal-compile.ts:30](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/reveal-compile.ts#L30)

***

### motion

> `readonly` **motion**: `LoweredMotionPlan`

Defined in: [compiler/src/reveal-compile.ts:29](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/reveal-compile.ts#L29)

***

### projectionId

> `readonly` **projectionId**: `ContentAddress`

Defined in: [compiler/src/reveal-compile.ts:31](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/reveal-compile.ts#L31)

***

### resultDigest

> `readonly` **resultDigest**: `AddressedDigest`

Defined in: [compiler/src/reveal-compile.ts:33](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/reveal-compile.ts#L33)

***

### viewTimeline?

> `readonly` `optional` **viewTimeline?**: [`MotionViewTimeline`](MotionViewTimeline.md)

Defined in: [compiler/src/reveal-compile.ts:32](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/reveal-compile.ts#L32)
