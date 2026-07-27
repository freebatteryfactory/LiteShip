[**LiteShip**](../../../../../README.md)

***

[LiteShip](../../../../../modules.md) / [liteship/src/reactive](../../README.md) / Scheduler

# Scheduler

Scheduler — clock abstraction that decouples animation driver from real time.
Pick the impl that matches the runtime: `raf` in browser, `noop` on the
server, `fixedStep` for deterministic video render, `audioSync` to drive UI
in lockstep with an [AVBridge](../../../media/variables/AVBridge.md).

## Type Aliases

- [AudioSync](type-aliases/AudioSync.md)
- [FixedStep](type-aliases/FixedStep.md)
