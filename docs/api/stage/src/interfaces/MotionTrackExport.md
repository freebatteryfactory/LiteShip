[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [stage/src](../README.md) / MotionTrackExport

# Interface: MotionTrackExport

Defined in: [stage/src/motion-export.ts:35](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/motion-export.ts#L35)

A content-addressed authored-motion track: the per-frame samples plus their artifact digest.

## Properties

### artifactDigest

> `readonly` **artifactDigest**: `AddressedDigest`

Defined in: [stage/src/motion-export.ts:39](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/motion-export.ts#L39)

Content address of the folded per-frame motion content (the video leg's built-in oracle).

***

### frames

> `readonly` **frames**: readonly [`MotionFrameSample`](MotionFrameSample.md)[]

Defined in: [stage/src/motion-export.ts:37](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/motion-export.ts#L37)

***

### totalFrames

> `readonly` **totalFrames**: `number`

Defined in: [stage/src/motion-export.ts:36](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/motion-export.ts#L36)
