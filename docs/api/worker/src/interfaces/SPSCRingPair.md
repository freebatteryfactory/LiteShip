[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [worker/src](../README.md) / SPSCRingPair

# Interface: SPSCRingPair

Defined in: [worker/src/spsc-ring.ts:99](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/spsc-ring.ts#L99)

A matched producer/consumer pair sharing one `SharedArrayBuffer`,
returned by [SPSCRing.createPair](../variables/SPSCRing.md#createpair). Named (rather than an inline
anonymous object) so the pair shape is a single referenceable type.

## Properties

### buffer

> `readonly` **buffer**: `SharedArrayBuffer`

Defined in: [worker/src/spsc-ring.ts:101](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/spsc-ring.ts#L101)

The shared buffer carrying the control header + data slots. Transfer this to the Worker.

***

### consumer

> `readonly` **consumer**: [`SPSCRingBufferShape`](SPSCRingBufferShape.md)

Defined in: [worker/src/spsc-ring.ts:105](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/spsc-ring.ts#L105)

Consumer-side handle (pop-only).

***

### producer

> `readonly` **producer**: [`SPSCRingBufferShape`](SPSCRingBufferShape.md)

Defined in: [worker/src/spsc-ring.ts:103](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/spsc-ring.ts#L103)

Producer-side handle (push-only).
