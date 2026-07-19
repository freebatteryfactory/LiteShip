[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / TaintFlow

# Interface: TaintFlow

Defined in: [gauntlet/src/facts/taint-facts.ts:67](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/taint-facts.ts#L67)

One traced taint flow — a value that originates at an untrusted SOURCE and
reaches a dangerous SINK, with the sanitizer (if any) the trace observed on the
path between them. Flat + already-decided (the host did the checker work); the
gate reads `sanitizedBy` to decide clean-vs-finding and uses the rest to write a
self-explaining Finding.

`_tag` is `'taint-flow'` — the discriminant (composition-over-inheritance: a
flow is data, differentiated by `_tag`, never a class).

## Properties

### \_tag

> `readonly` **\_tag**: `"taint-flow"`

Defined in: [gauntlet/src/facts/taint-facts.ts:69](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/taint-facts.ts#L69)

The discriminant — a closed tag (this family has one member today).

***

### path

> `readonly` **path**: readonly [`TaintPathStep`](TaintPathStep.md)[]

Defined in: [gauntlet/src/facts/taint-facts.ts:87](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/taint-facts.ts#L87)

The ordered intermediate path the value took from source to sink — each step
the symbol/assignment the trace threaded through. Human-readable, so the
reader sees EXACTLY how the value flowed (never an opaque "it reaches it").
The first entry is at/after the source; the last is at/before the sink.

***

### sanitizedBy

> `readonly` **sanitizedBy**: [`SanitizerSite`](SanitizerSite.md) \| `null`

Defined in: [gauntlet/src/facts/taint-facts.ts:80](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/taint-facts.ts#L80)

The sanitizer that broke the taint on the path, or `null` for an UNSANITIZED
flow (the real finding). When present the flow is clean — the gate reports it
only as an informational "sanitized flow" (the genuine green proving the seam
is guarded), never a blocking finding.

***

### sink

> `readonly` **sink**: [`TaintEndpoint`](TaintEndpoint.md)

Defined in: [gauntlet/src/facts/taint-facts.ts:73](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/taint-facts.ts#L73)

The SINK end — the dangerous operation the value reaches.

***

### source

> `readonly` **source**: [`TaintEndpoint`](TaintEndpoint.md)

Defined in: [gauntlet/src/facts/taint-facts.ts:71](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/taint-facts.ts#L71)

The SOURCE end — where the untrusted value originates.
