[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / BeatMarkerSet

# Interface: BeatMarkerSet

Defined in: [\_spine/beats.d.ts:27](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/beats.d.ts#L27)

Raw beat-marker projection — asset/sample space.

Produced by `@liteship/assets`. `beats` are strictly-increasing **sample
indices** (not milliseconds); convert with the source audio's sample rate.
This is the shape the `asset:beats` capability carries.

## Properties

### beats

> `readonly` **beats**: readonly `number`[]

Defined in: [\_spine/beats.d.ts:31](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/beats.d.ts#L31)

Beat positions as strictly-increasing sample indices.

***

### bpm

> `readonly` **bpm**: `number`

Defined in: [\_spine/beats.d.ts:29](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/beats.d.ts#L29)

Detected tempo estimate, in beats per minute.
