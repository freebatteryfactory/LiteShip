[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [quantizer/src](../README.md) / QuantizerRuntime

# Interface: QuantizerRuntime

Defined in: [quantizer/src/quantizer.ts:193](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L193)

Runtime injection for [QuantizerConfig.create](QuantizerConfig.md#create).

The crossing `timestamp` is an HLC whose `wall_ms` is epoch ms, so the
monotonic clock is the [Clock](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/interfaces/Clock.md) WALL boundary (`@czap/core`'s
`wallClock`), NOT the monotonic `systemClock`. It is injected here — at
instantiation, NOT in [QuantizerFromOptions](QuantizerFromOptions.md) — so it never enters the
content address (a clock is a volatile boundary, not part of a config's
identity; folding it into the address would also be unserializable). Each
`create()` call therefore owns a fresh monotonic HLC seeded from `node` and
advanced by `clock`: same input + a [Clock](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/interfaces/Clock.md) of fixed time → identical
timestamps regardless of how many other quantizers evaluated first. There is
no process-wide HLC.

## Properties

### clock?

> `readonly` `optional` **clock?**: [`Clock`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/interfaces/Clock.md)

Defined in: [quantizer/src/quantizer.ts:199](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L199)

Wall-clock boundary advancing this instance's HLC; defaults to
`@czap/core`'s `wallClock`. Pass a `fixedClock`/`manualClock` for
deterministic, replayable crossing timestamps.

***

### node?

> `readonly` `optional` **node?**: `string`

Defined in: [quantizer/src/quantizer.ts:201](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L201)

HLC node id seeding this instance's clock; defaults to `'quantizer'`.
