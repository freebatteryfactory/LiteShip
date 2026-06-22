[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [worker/src](../README.md) / SPSCRing

# Variable: SPSCRing

> `const` **SPSCRing**: `object`

Defined in: [worker/src/spsc-ring.ts:404](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/spsc-ring.ts#L404)

SPSC ring buffer namespace.

Lock-free single-producer single-consumer ring buffer backed by
`SharedArrayBuffer`. Designed for real-time compositor state streaming
between a Worker (producer) and the main thread (consumer) without
blocking either side. Uses only `Atomics.load`/`Atomics.store` --
fully non-blocking.

## Type Declaration

### attachConsumer

> `readonly` **attachConsumer**: (`sab`, `slotCount?`, `slotSize?`) => [`SPSCRingBufferShape`](../interfaces/SPSCRingBufferShape.md) = `_attachConsumer`

Attach as consumer to an existing SharedArrayBuffer.
Call this on the main thread that consumes data.

#### Parameters

##### sab

`SharedArrayBuffer`

The SharedArrayBuffer shared with the producer

##### slotCount?

`number`

Optional; validated against the buffer header (a mismatch throws)

##### slotSize?

`number`

Optional; validated against the buffer header (a mismatch throws)

#### Returns

[`SPSCRingBufferShape`](../interfaces/SPSCRingBufferShape.md)

A consumer-side [SPSCRingBufferShape](../interfaces/SPSCRingBufferShape.md)

#### Example

```ts
import { SPSCRing } from '@czap/worker';

// On the main thread after receiving buffer from Worker:
const consumer = SPSCRing.attachConsumer(sharedBuffer);
const out = new Float64Array(4);
if (consumer.pop(out)) {
  console.log('Received:', out); // Float64Array [1.0, 2.0, 3.0, 4.0]
}
```

### attachProducer

> `readonly` **attachProducer**: (`sab`, `slotCount?`, `slotSize?`) => [`SPSCRingBufferShape`](../interfaces/SPSCRingBufferShape.md) = `_attachProducer`

Attach as producer to an existing SharedArrayBuffer.
Call this inside the Worker that produces data.

#### Parameters

##### sab

`SharedArrayBuffer`

The SharedArrayBuffer from the main thread

##### slotCount?

`number`

Optional; validated against the buffer header (a mismatch throws)

##### slotSize?

`number`

Optional; validated against the buffer header (a mismatch throws)

#### Returns

[`SPSCRingBufferShape`](../interfaces/SPSCRingBufferShape.md)

A producer-side [SPSCRingBufferShape](../interfaces/SPSCRingBufferShape.md)

#### Example

```ts
import { SPSCRing } from '@czap/worker';

// Inside a Worker's message handler:
self.onmessage = (e) => {
  const producer = SPSCRing.attachProducer(e.data.buffer);
  const data = new Float64Array([1.0, 2.0, 3.0, 4.0]);
  producer.push(data); // true if buffer not full
};
```

### createPair

> `readonly` **createPair**: (`slotCount`, `slotSize`) => [`SPSCRingPair`](../interfaces/SPSCRingPair.md) = `_createPair`

Create a matched producer/consumer pair sharing the same SharedArrayBuffer.

Typically called on the main thread; the `buffer` (SharedArrayBuffer) is
then transferred to the Worker via `postMessage`, and the Worker calls
`SPSCRing.attachProducer(buffer)` to get its side of the ring — the
ring geometry rides in the buffer header, so nothing else needs to be
shuttled through the message protocol.

#### Parameters

##### slotCount

`number`

Ring depth: number of slots (power of 2 recommended)

##### slotSize

`number`

Entry width: number of Float64 values per slot

#### Returns

[`SPSCRingPair`](../interfaces/SPSCRingPair.md)

A [SPSCRingPair](../interfaces/SPSCRingPair.md): the shared buffer + producer/consumer handles

#### Example

```ts
import { SPSCRing } from '@czap/worker';

const { buffer, producer, consumer } = SPSCRing.createPair(64, 4);
// producer.push(new Float64Array([1, 2, 3, 4])); // true
// consumer.pop(new Float64Array(4));              // true
// Transfer buffer to a Worker via postMessage
worker.postMessage({ buffer });
```

The two arguments are both bare positive integers and are NOT
interchangeable: `slotCount` is the ring depth (how many entries),
`slotSize` the entry width (Float64 lanes per entry). Transposing them
silently produces a different geometry rather than an error, so the
order is `(depth, width)` — same order as the memory-layout header
above (`[2]: slotCount`, `[3]: slotSize`). Each is guarded as a positive
integer ([\_makeRing](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/spsc-ring.ts) throws otherwise), so `0`/negative/fractional
values fail loudly.

## Example

```ts
import { SPSCRing } from '@czap/worker';

// Main thread: create pair and send buffer to Worker
const { buffer, producer, consumer } = SPSCRing.createPair(128, 8);
worker.postMessage({ buffer });

// In Worker: attach as producer (geometry rides in the buffer header)
// const producer = SPSCRing.attachProducer(buffer);
// producer.push(new Float64Array(8));

// Main thread: consume in animation loop
const out = new Float64Array(8);
function frame() {
  while (consumer.pop(out)) { /* process out */ }
  requestAnimationFrame(frame);
}
```
