[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / SSE

# Variable: SSE

> `const` **SSE**: `object`

Defined in: [web/src/stream/sse.ts:580](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/sse.ts#L580)

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

> **buildUrl**: (`baseUrl`, `artifactId?`, `lastEventId?`) => `string`

Re-export of the SSE URL-builder (appends `artifactId` + cursor params).

Build an SSE endpoint URL with optional artifact ID and lastEventId.

#### Parameters

##### baseUrl

`string`

##### artifactId?

`string`

##### lastEventId?

`string`

#### Returns

`string`

### calculateDelay

> **calculateDelay**: (`attempt`, `config`, `rng`) => `number`

Re-export of the exponential-backoff delay calculator.

Calculate reconnection delay using exponential backoff with jitter.

The jitter source is injectable: pass a seeded [Rng](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/interfaces/Rng.md) to make
reconnection-backoff deterministic in tests; it defaults to `systemRng`
(live `Math.random`) in production.

#### Parameters

##### attempt

`number`

##### config

[`ReconnectConfig`](../interfaces/ReconnectConfig.md)

##### rng?

[`Rng`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/interfaces/Rng.md) = `systemRng`

#### Returns

`number`

### create

> **create**: (`config`) => [`SSEClient`](../interfaces/SSEClient.md)

Create an SSE client that manages a Server-Sent Events connection with
automatic reconnection, heartbeat timeout tracking, and backpressure-aware
message buffering.

**Preflight is mandatory and cannot be disabled.** Every incoming message
is pre-screened by a fast first-character check before `JSON.parse` is
attempted. Non-JSON payloads (plain text, numeric strings, empty strings)
are dropped without entering the try/catch path. This defence-in-depth
guard is always-on; there is no configuration knob to bypass it.
See the red-team regression suite (`tests/regression/`) for the injection
scenarios that motivated this constraint.

**Resumption is host-wired.** This client handles transport-level
reconnection only: exponential backoff plus re-sending the
`lastEventId` cursor on the stream URL (via [buildUrl](#buildurl)). It does
NOT perform gap recovery — replaying missed patches or fetching a
fresh snapshot is the host's job, composed from the sibling
`Resumption` namespace (see `./resumption.js` and the Runtime Wiring
Model in `STATUS.md`, status `host-wired`). The reference wiring
lives in `packages/astro/src/runtime/stream.ts`
(`saveResumptionState` + `reconcileResumption`).

#### Parameters

##### config

[`SSEConfig`](../interfaces/SSEConfig.md)

SSE connection configuration

#### Returns

[`SSEClient`](../interfaces/SSEClient.md)

An [SSEClient](../interfaces/SSEClient.md)

#### Examples

```ts
import { SSE } from '@czap/web';

const client = SSE.create({ url: '/api/stream', artifactId: 'doc-1' });
for await (const msg of client.messages) {
  console.log(msg);
}
client.close();
```

```ts
// Fully synchronous consumption (the live morph directives): pass callbacks
// and skip the async buffer entirely.
import { SSE } from '@czap/web';

const client = SSE.create({
  url: '/api/stream',
  artifactId: 'doc-1',
  onMessage: (msg) => applyPatch(msg),
  onStateChange: (state) => updateBadge(state),
});
// Teardown owned by the host (e.g. a Lifetime finalizer):
// lifetime.add(() => client.close());
```

### parseMessage

> **parseMessage**: (`event`) => [`SSEMessage`](../type-aliases/SSEMessage.md) \| `null`

Re-export of the pure SSE line-parser.

Parse an SSE MessageEvent into a typed SSEMessage.
Returns null if the event data is not valid JSON or lacks a type field.

Preflight is mandatory and unconditional: a fast first-character scan
runs before `JSON.parse` on every string payload. Only strings that start
with `{` or `[` (after leading whitespace) proceed to parse; all other
inputs are rejected immediately. This avoids the ~15us try/catch cost on
obviously non-JSON strings and closes the injection vector where a server
sends plain-text or numeric data that could trigger unexpected parse paths.
There is intentionally no opt-out — see red-team regression suite.

#### Parameters

##### event

`MessageEvent`

#### Returns

[`SSEMessage`](../type-aliases/SSEMessage.md) \| `null`

## Example

```ts
import { SSE } from '@czap/web';

const client = SSE.create({ url: '/api/events' });
const state = client.state; // 'connecting' | 'connected' | ...
for await (const msg of client.messages) {
  console.log(msg.type);
}
client.close();
```
