[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / OverflowPolicy

# Type Alias: OverflowPolicy

> **OverflowPolicy** = `"drop-newest"` \| `"drop-oldest"` \| `"coalesce-by-id"`

Defined in: [web/src/types.ts:231](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L231)

Policy applied when the SSE receive buffer is saturated.

A plain string union of policy *labels* — not a `_tag`/`type` value
discriminant. `'block'` is intentionally absent: `EventSource.onmessage`
is a synchronous browser callback that cannot suspend, so there is no
back-channel to pause the producer; backpressure can only ever drop or
collapse, never block.

- `drop-newest`    — reject the incoming message when full.
- `drop-oldest`    — evict the oldest buffered message, then append.
- `coalesce-by-id` — supersede an earlier same-id `patch` in place;
  keyless/ordered messages (LLM text tokens, `batch`, `snapshot`,
  `signal`, `receipt`, `heartbeat`) bypass coalesce and keep strict FIFO.
  Under saturation the fallback evicts the oldest keyed (idempotent)
  patch before ever touching an ordered/keyless entry, so an LLM token is
  never dropped while a patch is still evictable.
