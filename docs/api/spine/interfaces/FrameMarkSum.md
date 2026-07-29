[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / FrameMarkSum

# Interface: FrameMarkSum

Defined in: [\_spine/scene.d.ts:53](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/scene.d.ts#L53)

Deferred sum of frame-space and beat-space offsets. Produced by
`addFrameMarks` when a beat mark and a numeric frame mark are
combined (e.g. `Scene.include(sub, { offset: Beat(8) })` over a
sub-scene authored in raw frames). Resolved by `compileScene` as
`frames + resolveBeat(Beat(beats), { bpm, fps })`.

## Properties

### \_tag

> `readonly` **\_tag**: `"mark-sum"`

Defined in: [\_spine/scene.d.ts:55](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/scene.d.ts#L55)

Discriminant tag.

***

### beats

> `readonly` **beats**: `number`

Defined in: [\_spine/scene.d.ts:59](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/scene.d.ts#L59)

Beat-space portion of the mark, resolved against scene BPM/fps at compile time.

***

### frames

> `readonly` **frames**: `number`

Defined in: [\_spine/scene.d.ts:57](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/scene.d.ts#L57)

Frame-space portion of the mark.
