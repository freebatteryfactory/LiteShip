[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [quantizer/src](../README.md) / QuantizerRuntime

# Interface: QuantizerRuntime

Defined in: [quantizer/src/quantizer.ts:185](https://github.com/heyoub/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L185)

Runtime injection for [QuantizerConfig.create](QuantizerConfig.md#create).

The crossing `timestamp` is an HLC whose `wall_ms` is epoch ms, so the
monotonic clock is the Clock WALL boundary (`@czap/core`'s
`wallClock`), NOT the monotonic `systemClock`. It is injected here — at
instantiation, NOT in [QuantizerFromOptions](QuantizerFromOptions.md) — so it never enters the
content address (a clock is a volatile boundary, not part of a config's
identity; folding it into the address would also be unserializable). Each
`create()` call therefore owns a fresh monotonic HLC seeded from `node` and
advanced by `clock`: same input + a Clock of fixed time → identical
timestamps regardless of how many other quantizers evaluated first. There is
no process-wide HLC.

## Properties

### clock?

> `readonly` `optional` **clock?**: `Clock`

Defined in: [quantizer/src/quantizer.ts:191](https://github.com/heyoub/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L191)

Wall-clock boundary advancing this instance's HLC; defaults to
`@czap/core`'s `wallClock`. Pass a `fixedClock`/`manualClock` for
deterministic, replayable crossing timestamps.

***

### node?

> `readonly` `optional` **node?**: `string`

Defined in: [quantizer/src/quantizer.ts:193](https://github.com/heyoub/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L193)

HLC node id seeding this instance's clock; defaults to `'quantizer'`.
