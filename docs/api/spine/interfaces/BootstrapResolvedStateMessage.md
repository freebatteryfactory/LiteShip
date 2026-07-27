[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / BootstrapResolvedStateMessage

# Interface: BootstrapResolvedStateMessage

Defined in: [\_spine/worker.d.ts:84](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L84)

Authoritative state snapshot installed during worker bootstrap.

## Properties

### ack?

> `readonly` `optional` **ack?**: `boolean`

Defined in: [\_spine/worker.d.ts:87](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L87)

***

### states

> `readonly` **states**: readonly [`ResolvedStateEntry`](ResolvedStateEntry.md)[]

Defined in: [\_spine/worker.d.ts:86](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L86)

***

### type

> `readonly` **type**: `"bootstrap-resolved-state"`

Defined in: [\_spine/worker.d.ts:85](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L85)
