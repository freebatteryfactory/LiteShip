[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / BeatComponent

# Interface: BeatComponent

Defined in: [\_spine/beats.d.ts:39](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/beats.d.ts#L39)

Scene/world beat marker — timeline space.

Consumed by `@liteship/scene`; what `SyncSystem` queries via `world.query('Beat')`.

## Properties

### \_tag

> `readonly` **\_tag**: `"beat"`

Defined in: [\_spine/beats.d.ts:41](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/beats.d.ts#L41)

Discriminant tag — Beat-typed ECS component.

***

### anchorTrackId?

> `readonly` `optional` **anchorTrackId?**: `string`

Defined in: [\_spine/beats.d.ts:47](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/beats.d.ts#L47)

Optional pointer back to the audio source track that anchored this beat.

***

### strength

> `readonly` **strength**: `number`

Defined in: [\_spine/beats.d.ts:45](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/beats.d.ts#L45)

Normalized beat strength.

***

### timeMs

> `readonly` **timeMs**: `number`

Defined in: [\_spine/beats.d.ts:43](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/beats.d.ts#L43)

Beat time in **milliseconds** from scene start.
