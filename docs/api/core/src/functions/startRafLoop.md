[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / startRafLoop

# Function: startRafLoop()

> **startRafLoop**(`onFrame`): () => `void`

Defined in: [core/src/scheduler.ts:228](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/scheduler.ts#L228)

Drive `onFrame(elapsedMs)` once per animation frame with the wall-clock time
elapsed since the first frame — the SSR-guarded rAF loop the motion/time skins
hand-rolled. Returns a `cancel` that stops the loop (idempotent — safe after it
has already stopped).

SSR-guarded: where `requestAnimationFrame` is absent (server / Node), it starts
nothing and the returned `cancel` is a no-op, so a caller never has to branch on
the environment.

## Parameters

### onFrame

(`elapsedMs`) => `void`

## Returns

() => `void`
