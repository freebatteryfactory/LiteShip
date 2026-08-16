# Web Transport

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `01_hosts/web/06_transport/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own the physical browser side of fetch, SSE, and readable streams: connection lifetime, cancellation, watchdog, reconnection, bounded buffering, typed carrier decoding, and resumption transport.

## Owns

- Connection identity and owned connection lifetime.
- The closed carrier-decoder set.
- Bounded buffering, reconnection, and heartbeat shapes.
- Physical resumption from the last acknowledged core stream position.

## Does not own

- Stream envelopes, acknowledgements, checkpoints, replay, patch families, completeness, or backpressure meaning. Core owns those.
- Operation and protocol translation. A later browser wire owns that.

## One transport authority, exact arms

There is one physical transport authority with a typed carrier path — and the transports are not pretended identical. The connection algebra shares a base (identity, endpoint, decoder, bound, owned lifecycle) and gives each arm exactly its own capabilities: a one-shot fetch carries no heartbeat, reconnection, or resumption, because it has nothing to resume; an event-source carries all three; a readable stream is consumed once and cancelled through its lifecycle. The old defect — a generic SSE path that dropped bare text while Astro carried a second special transport — does not return.

Resumption, where it exists, is core's `StreamResumeRequest`: stream identity, acknowledgement, and checkpoint together. A naked sequence number cannot say which stream it acknowledges. Each carrier arm holds a real decode contract — encoded input, typed output, typed failure — because a carrier without a decoder is a roster entry, not a capability. Every connection exposes an actual receive operation: a connection that could be described but not consumed from would be a photograph of a pipe.

The plan selects a persistent `TransportAuthority`, an offer requiring the intrinsic `BrowserTransportFacility` — the admitted authority over the fetch, EventSource, and readable-stream entrypoints together — and the sink policy, so no connection opens outside the network allowlists. Its open operation consumes the complete request — kind, endpoint, decoder, bound, and applicable replay state — and each live connection is a per-use resource with its own identity and owned lifecycle.

## Laws

- Every connection arm is bounded, owned, and able to receive.
- Resumption keeps the whole stream identity, never a naked sequence.
- A one-shot fetch carries no replay machinery.
- Every carrier actually decodes; the set stays closed and derived.
- The transport authority is an offer requiring the transport facility and the sink policy, and opening consumes the complete request.

## Proof obligations

- One unified transport serves every declared carrier; no second special transport exists.
- Reconnection resumes without loss or duplication from the acknowledged position.

The first is `system/01_assurance` over the transport population; the second is an implementation fixture.

## Implementation boundary

Reconnection, buffering, and heartbeat profiles remain empirical; one transport realization must preserve carrier identity, ordering, custody, evidence, and failure across browser APIs.
