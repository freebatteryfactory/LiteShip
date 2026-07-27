[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / HLCClock

# Interface: HLCClock

Defined in: [\_spine/core.d.ts:931](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L931)

A managed HLC clock handle — a plain (Effect-free) mutable holder over the pure
increment/merge ops, reading wall time through an injected [Clock](Clock.md) (Wave 6).
`tick`/`receive` advance the closure-held timestamp and return it; `current`
reads without advancing.

## Methods

### current()

> **current**(): [`HLC`](../type-aliases/HLC.md)

Defined in: [\_spine/core.d.ts:934](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L934)

#### Returns

[`HLC`](../type-aliases/HLC.md)

***

### receive()

> **receive**(`remote`): [`HLC`](../type-aliases/HLC.md)

Defined in: [\_spine/core.d.ts:933](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L933)

#### Parameters

##### remote

[`HLC`](../type-aliases/HLC.md)

#### Returns

[`HLC`](../type-aliases/HLC.md)

***

### tick()

> **tick**(): [`HLC`](../type-aliases/HLC.md)

Defined in: [\_spine/core.d.ts:932](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L932)

#### Returns

[`HLC`](../type-aliases/HLC.md)
