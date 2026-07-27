[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / HLCClock

# Interface: HLCClock

Defined in: [\_spine/core.d.ts:1146](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1146)

A managed HLC clock handle — a plain (Effect-free) mutable holder over the pure
increment/merge ops, reading wall time through an injected [Clock](Clock.md) (Wave 6).
`tick`/`receive` advance the closure-held timestamp and return it; `current`
reads without advancing.

## Methods

### current()

> **current**(): [`HLC`](../type-aliases/HLC.md)

Defined in: [\_spine/core.d.ts:1149](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1149)

#### Returns

[`HLC`](../type-aliases/HLC.md)

***

### receive()

> **receive**(`remote`): [`HLC`](../type-aliases/HLC.md)

Defined in: [\_spine/core.d.ts:1148](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1148)

#### Parameters

##### remote

[`HLC`](../type-aliases/HLC.md)

#### Returns

[`HLC`](../type-aliases/HLC.md)

***

### tick()

> **tick**(): [`HLC`](../type-aliases/HLC.md)

Defined in: [\_spine/core.d.ts:1147](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1147)

#### Returns

[`HLC`](../type-aliases/HLC.md)
