[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / QuantizerRuntime

# Interface: QuantizerRuntime

Defined in: [\_spine/quantizer.d.ts:60](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/quantizer.d.ts#L60)

Per-instantiation runtime injection for `createQuantizer`: the wall-clock
boundary advancing this instance's monotonic crossing HLC (defaults to
`wallClock`) and the HLC node id. Injected at instantiation, never part of the
cached config's content-addressed identity.

## Properties

### clock?

> `readonly` `optional` **clock?**: [`Clock`](Clock.md)

Defined in: [\_spine/quantizer.d.ts:61](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/quantizer.d.ts#L61)

***

### node?

> `readonly` `optional` **node?**: `string`

Defined in: [\_spine/quantizer.d.ts:62](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/quantizer.d.ts#L62)
