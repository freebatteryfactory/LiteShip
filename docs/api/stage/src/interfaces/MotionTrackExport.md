[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [stage/src](../README.md) / MotionTrackExport

# Interface: MotionTrackExport

Defined in: [stage/src/motion-export.ts:36](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/motion-export.ts#L36)

A content-addressed authored-motion track: the per-frame samples plus their artifact digest.

## Properties

### artifactDigest

> `readonly` **artifactDigest**: [`AddressedDigest`](../../../spine/interfaces/AddressedDigest.md)

Defined in: [stage/src/motion-export.ts:40](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/motion-export.ts#L40)

Content address of the folded per-frame motion content (the video leg's built-in oracle).

***

### frames

> `readonly` **frames**: readonly [`MotionFrameSample`](MotionFrameSample.md)[]

Defined in: [stage/src/motion-export.ts:38](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/motion-export.ts#L38)

***

### totalFrames

> `readonly` **totalFrames**: `number`

Defined in: [stage/src/motion-export.ts:37](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/motion-export.ts#L37)
