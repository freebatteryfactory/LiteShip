[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / FadeEnvelope

# Interface: FadeEnvelope

Defined in: [\_spine/scene.d.ts:71](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/scene.d.ts#L71)

Fade envelope (linear over a beat span). Authored via `fade.in` / `fade.out`.

## Properties

### \_tag

> `readonly` **\_tag**: `"envelope"`

Defined in: [\_spine/scene.d.ts:73](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/scene.d.ts#L73)

Discriminant tag.

***

### curve

> `readonly` **curve**: `"linear-in"` \| `"linear-out"`

Defined in: [\_spine/scene.d.ts:75](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/scene.d.ts#L75)

Curve kind — linear-in or linear-out.

***

### span

> `readonly` **span**: [`BeatHandle`](BeatHandle.md)

Defined in: [\_spine/scene.d.ts:77](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/scene.d.ts#L77)

Duration of the fade in beats.
