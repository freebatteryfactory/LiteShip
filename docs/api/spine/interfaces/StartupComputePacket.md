[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / StartupComputePacket

# Interface: StartupComputePacket

Defined in: [\_spine/worker.d.ts:66](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L66)

First compute payload bundled with worker bootstrap.

## Properties

### bootstrapMode

> `readonly` **bootstrapMode**: `"cold"` \| `"warm-snapshot"` \| `"rebuild"`

Defined in: [\_spine/worker.d.ts:67](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L67)

***

### registrations

> `readonly` **registrations**: readonly [`BootstrapQuantizerRegistration`](BootstrapQuantizerRegistration.md)[]

Defined in: [\_spine/worker.d.ts:68](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L68)

***

### updates

> `readonly` **updates**: readonly [`WorkerUpdate`](../type-aliases/WorkerUpdate.md)[]

Defined in: [\_spine/worker.d.ts:69](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L69)
