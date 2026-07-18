[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / TransitionCase

# Interface: TransitionCase

Defined in: [gauntlet/src/transition-facts.ts:69](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/transition-facts.ts#L69)

One evaluated bisimulation case — the flat, decided outcome of unfolding ONE seeded
operation history over both oracle transports, plus the data the gate needs to write
a self-explaining, REPLAYABLE Finding. An `equivalent` case is a conformant green
(no finding); a `divergent` case is the behavior change the gate reports; an
`unevidenced` case is a coverage gap the gate surfaces (and the ratchet floors).

## Properties

### implementationObservationDigest

> `readonly` **implementationObservationDigest**: `string`

Defined in: [gauntlet/src/transition-facts.ts:79](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/transition-facts.ts#L79)

The content address of the IMPLEMENTATION's observation over this history (the transport under test).

***

### modelObservationDigest

> `readonly` **modelObservationDigest**: `string`

Defined in: [gauntlet/src/transition-facts.ts:77](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/transition-facts.ts#L77)

The content address of the MODEL's observation over this history (the single-oracle side).

***

### operationCount

> `readonly` **operationCount**: `number`

Defined in: [gauntlet/src/transition-facts.ts:75](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/transition-facts.ts#L75)

The number of operations in the history (report context — how deep the walk was).

***

### seed

> `readonly` **seed**: `string`

Defined in: [gauntlet/src/transition-facts.ts:71](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/transition-facts.ts#L71)

The pinned seed that generated the op history — the replay key half (`{ family, seed, traceDigest }`).

***

### status

> `readonly` **status**: [`TransitionStatus`](../type-aliases/TransitionStatus.md)

Defined in: [gauntlet/src/transition-facts.ts:81](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/transition-facts.ts#L81)

The decided bisimulation verdict — `equivalent` (green) / `divergent` (finding) / `unevidenced` (gap).

***

### traceDigest

> `readonly` **traceDigest**: `string`

Defined in: [gauntlet/src/transition-facts.ts:73](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/transition-facts.ts#L73)

The content address of the op history (canonical-CBOR → fnv1a) — the replay key half.
