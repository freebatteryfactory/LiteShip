[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / ResolvedStateEntry

# Interface: ResolvedStateEntry

Defined in: [\_spine/worker.d.ts:58](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L58)

A single resolved discrete-state entry in a bootstrap/apply message.
`generation` increases monotonically so receivers can discard stale
out-of-order deliveries.

## Properties

### generation

> `readonly` **generation**: `number`

Defined in: [\_spine/worker.d.ts:61](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L61)

***

### name

> `readonly` **name**: `string`

Defined in: [\_spine/worker.d.ts:59](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L59)

***

### state

> `readonly` **state**: [`StateName`](../type-aliases/StateName.md)

Defined in: [\_spine/worker.d.ts:60](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L60)
