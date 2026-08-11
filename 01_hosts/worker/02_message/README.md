# Worker Messaging

Status: specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `01_hosts/worker/02_message/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own the physical message seam: channel and endpoint identity, typed addressed envelopes, decode contracts, correlation and reply, acknowledgement, closure, and bounded flow.

## Owns

- Channel identity and the two endpoint roles — parent and worker, exactly one of each per channel.
- The envelope: exact channel, correlation identity, decoded payload.
- The decode contract: encoded input, typed output, typed failure — a carrier without a decoder is a roster entry, not a capability.
- The messaging provider, whose `open` is decoder-correlated: a text contract yields a channel of strings, provably not a channel of bytes.

## Does not own

- Stream envelopes, acknowledgement semantics, checkpoints, replay, patch families, or backpressure meaning — core. Worker messages carry core families; they never redefine them.
- Transfer custody — `03_transfer` declares what crossing a channel does to ownership.

## One provider, per-use channels

The plan selects a persistent `MessagingAuthority`; every channel is a per-use owned resource with its own identity, decoder, bound, and lifecycle. Two channels are two values. Every channel exposes real send, receive, reply, and close operations over its own payload family — a channel that could be described but not consumed from would be a photograph of a pipe.

## Laws

- Opening is decoder- and identity-correlated; a channel of one decoded type or one identity is not another's, and an envelope names the exact channel it travels.
- A channel sends, receives, replies, and closes its own payload family.
- An acknowledgement names the exact correlation it answers — sending correlation A yields a receipt of exactly A.
- Channels are bounded, owned, repeatable resources.

## Proof obligations

- Actual ordering guarantees and acknowledgement behavior match the declared relationships at runtime.

This is an implementation fixture; batch sizes and buffering thresholds are empirical.

## Implementation boundary

Specified. No postMessage, MessageChannel, or decode code exists or is authorized.

## Machine-checkable projection

```yaml
home:
  path: 01_hosts/worker/02_message
  title: "Worker Messaging"
  maturity: specified
  implementation: absent
  runtime_exports: false
  dependency_authority: source-imports
  semantic_decisions:
  - decoder-correlated-channel-opening
  - one-parent-one-worker-endpoint-per-channel
  - envelopes-carry-core-families-never-redefine-them
  - channels-are-bounded-owned-resources
  production_authority: false
```
