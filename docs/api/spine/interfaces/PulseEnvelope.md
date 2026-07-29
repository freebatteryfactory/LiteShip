[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / PulseEnvelope

# Interface: PulseEnvelope

Defined in: [\_spine/scene.d.ts:81](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/scene.d.ts#L81)

Pulse envelope (periodic, amplitude-scaled). Authored via `pulse.every`.

## Properties

### \_tag

> `readonly` **\_tag**: `"envelope"`

Defined in: [\_spine/scene.d.ts:83](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/scene.d.ts#L83)

Discriminant tag.

***

### amplitude

> `readonly` **amplitude**: `number`

Defined in: [\_spine/scene.d.ts:89](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/scene.d.ts#L89)

Peak amplitude (0–1 range, may exceed 1 for overdrive).

***

### curve

> `readonly` **curve**: `"pulse"`

Defined in: [\_spine/scene.d.ts:85](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/scene.d.ts#L85)

Curve kind — pulse.

***

### period

> `readonly` **period**: [`BeatHandle`](BeatHandle.md)

Defined in: [\_spine/scene.d.ts:87](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/scene.d.ts#L87)

Period of the pulse in beats.
