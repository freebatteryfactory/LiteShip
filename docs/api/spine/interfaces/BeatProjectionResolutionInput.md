[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / BeatProjectionResolutionInput

# Interface: BeatProjectionResolutionInput

Defined in: [\_spine/beats.d.ts:63](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/beats.d.ts#L63)

Input contract for the projection → scene-beats resolver
(`resolveBeatProjectionToSceneBeats`, owned by `@liteship/scene`).

The resolver is the official bridge between the two stages: it converts
each sample index to milliseconds (`timeMs = index / sampleRate * 1000`),
preserves order and count, and stamps a deterministic strength.

## Properties

### anchorTrackId?

> `readonly` `optional` **anchorTrackId?**: `string`

Defined in: [\_spine/beats.d.ts:69](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/beats.d.ts#L69)

Optional anchor track id stamped onto every resolved marker.

***

### defaultStrength?

> `readonly` `optional` **defaultStrength?**: `number`

Defined in: [\_spine/beats.d.ts:71](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/beats.d.ts#L71)

Strength assigned to every resolved marker; defaults to 1.

***

### projection

> `readonly` **projection**: [`BeatMarkerSet`](BeatMarkerSet.md)

Defined in: [\_spine/beats.d.ts:65](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/beats.d.ts#L65)

Raw asset-space projection to resolve.

***

### sampleRate

> `readonly` **sampleRate**: `number`

Defined in: [\_spine/beats.d.ts:67](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/beats.d.ts#L67)

Sample rate of the source audio, in Hz — converts indices to milliseconds.
