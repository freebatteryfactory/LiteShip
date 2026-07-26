[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/runtime](../README.md) / SSE

# Variable: SSE

> `const` **SSE**: `object`

Defined in: web/dist/stream/sse.d.ts:150

SSE client namespace.

Creates and manages Server-Sent Events connections with automatic
exponential-backoff reconnection, heartbeat timeout detection,
backpressure-aware message buffering via the sse-pure overflow buffer,
and URL construction helpers.

**Resumption is host-wired.** `SSE` is the transport; the sibling
`Resumption` namespace (`./resumption.js`) is the recovery protocol
(replay / snapshot after a gap). Hosts compose the two — see the
composed example on [create](#create) and the reference wiring in
`packages/astro/src/runtime/stream.ts`.

## Type Declaration

### buildUrl

> `readonly` **buildUrl**: *typeof* `_buildUrl`

### calculateDelay

> `readonly` **calculateDelay**: *typeof* `_calculateDelay`

### create

> `readonly` **create**: *typeof* `create`

### parseMessage

> `readonly` **parseMessage**: *typeof* `_parseMessage`

## Example

```ts
import { SSE } from '@liteship/web';

const client = SSE.create({ url: '/api/events' });
const state = client.state; // 'connecting' | 'connected' | ...
for await (const msg of client.messages) {
  console.log(msg.type);
}
client.close();
```
