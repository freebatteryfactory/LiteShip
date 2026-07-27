[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / SPSCRingPair

# Interface: SPSCRingPair

Defined in: [\_spine/worker.d.ts:318](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L318)

A matched producer/consumer pair sharing one `SharedArrayBuffer`,
returned by [SPSCRing.createPair](../type-aliases/SPSCRing.md#createpair). Named (rather than an inline
anonymous object) so the pair shape is a single referenceable type.

## Properties

### buffer

> `readonly` **buffer**: `SharedArrayBuffer`

Defined in: [\_spine/worker.d.ts:320](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L320)

The shared buffer carrying the control header + data slots. Transfer this to the Worker.

***

### consumer

> `readonly` **consumer**: [`SPSCRing`](../type-aliases/SPSCRing.md)

Defined in: [\_spine/worker.d.ts:324](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L324)

Consumer-side handle (pop-only).

***

### producer

> `readonly` **producer**: [`SPSCRing`](../type-aliases/SPSCRing.md)

Defined in: [\_spine/worker.d.ts:322](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L322)

Producer-side handle (push-only).
