[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / ApplyResolvedStateMessage

# Interface: ApplyResolvedStateMessage

Defined in: [\_spine/worker.d.ts:92](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L92)

Host command applying a newer authoritative state snapshot.

## Properties

### ack?

> `readonly` `optional` **ack?**: `boolean`

Defined in: [\_spine/worker.d.ts:95](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L95)

***

### states

> `readonly` **states**: readonly [`ResolvedStateEntry`](ResolvedStateEntry.md)[]

Defined in: [\_spine/worker.d.ts:94](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L94)

***

### type

> `readonly` **type**: `"apply-resolved-state"`

Defined in: [\_spine/worker.d.ts:93](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L93)
