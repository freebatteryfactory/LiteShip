[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / BeatHandle

# Interface: BeatHandle

Defined in: [\_spine/scene.d.ts:39](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/scene.d.ts#L39)

Beat handle produced by `Beat(count)` — a musical position the scene
compiler resolves to a frame index using the scene's BPM + fps.
Spec 1 §5.4: "scene BPM converts Beat(n) → Millis at compile time".

## Properties

### \_tag

> `readonly` **\_tag**: `"beat"`

Defined in: [\_spine/scene.d.ts:41](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/scene.d.ts#L41)

Discriminant tag.

***

### count

> `readonly` **count**: `number`

Defined in: [\_spine/scene.d.ts:43](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/scene.d.ts#L43)

Number of beats (may be fractional).
