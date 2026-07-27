[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / SPSCRingPair

# Interface: SPSCRingPair

Defined in: [\_spine/worker.d.ts:317](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L317)

A matched producer/consumer pair sharing one `SharedArrayBuffer`,
returned by [SPSCRing.createPair](../type-aliases/SPSCRing.md#createpair). Named (rather than an inline
anonymous object) so the pair shape is a single referenceable type.

## Properties

### buffer

> `readonly` **buffer**: `SharedArrayBuffer`

Defined in: [\_spine/worker.d.ts:319](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L319)

The shared buffer carrying the control header + data slots. Transfer this to the Worker.

***

### consumer

> `readonly` **consumer**: [`SPSCRing`](../type-aliases/SPSCRing.md)

Defined in: [\_spine/worker.d.ts:323](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L323)

Consumer-side handle (pop-only).

***

### producer

> `readonly` **producer**: [`SPSCRing`](../type-aliases/SPSCRing.md)

Defined in: [\_spine/worker.d.ts:321](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L321)

Producer-side handle (push-only).
