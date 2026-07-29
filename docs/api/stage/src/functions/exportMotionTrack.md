[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [stage/src](../README.md) / exportMotionTrack

# Function: exportMotionTrack()

> **exportMotionTrack**(`plan`, `totalFrames`): [`MotionTrackExport`](../interfaces/MotionTrackExport.md)

Defined in: [stage/src/motion-export.ts:85](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/motion-export.ts#L85)

Cast an authored motion program to a content-addressed video track: sample every frame
(see [sampleMotionFrames](sampleMotionFrames.md)), then content-address the folded per-frame CSS through
the ONE kernel (`CanonicalCbor.encode` → `AddressedDigest.of`). The returned
`artifactDigest` pins the exact motion the frames carry — the built-in oracle for the
video leg, exactly as `dual-export.ts` content-addresses its frame stream.
Frame-count admission is identical to [sampleMotionFrames](sampleMotionFrames.md); malformed counts never mint partial artifacts.

## Parameters

### plan

[`RuntimeWritePlan`](../../../liteship/src/motion/interfaces/RuntimeWritePlan.md)

### totalFrames

`number`

## Returns

[`MotionTrackExport`](../interfaces/MotionTrackExport.md)
