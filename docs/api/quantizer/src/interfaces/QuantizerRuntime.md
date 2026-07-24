[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [quantizer/src](../README.md) / QuantizerRuntime

# Interface: QuantizerRuntime

Defined in: [quantizer/src/quantizer.ts:225](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L225)

Runtime injection for [createQuantizer](../functions/createQuantizer.md).

The crossing `timestamp` is an HLC whose `wall_ms` is epoch ms, so the
monotonic clock is the [Clock](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/interfaces/Clock.md) WALL boundary (`@liteship/core`'s
`wallClock`), NOT the monotonic `systemClock`. It is injected here — at
instantiation, NOT in [DefineQuantizerOptions](DefineQuantizerOptions.md) — so it never enters the
content address (a clock is a volatile boundary, not part of a config's
identity; folding it into the address would also be unserializable). Each
[createQuantizer](../functions/createQuantizer.md) call therefore owns a fresh monotonic HLC seeded from
`node` and advanced by `clock`: same input + a [Clock](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/interfaces/Clock.md) of fixed time →
identical timestamps regardless of how many other quantizers evaluated first.
There is no process-wide HLC.

## Properties

### clock?

> `readonly` `optional` **clock?**: [`Clock`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/interfaces/Clock.md)

Defined in: [quantizer/src/quantizer.ts:231](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L231)

Wall-clock boundary advancing this instance's HLC; defaults to
`@liteship/core`'s `wallClock`. Pass a `fixedClock`/`manualClock` for
deterministic, replayable crossing timestamps.

***

### node?

> `readonly` `optional` **node?**: `string`

Defined in: [quantizer/src/quantizer.ts:233](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L233)

HLC node id seeding this instance's clock; defaults to `'quantizer'`.
