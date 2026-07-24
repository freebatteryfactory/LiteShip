[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / stage/src

# stage/src

`@liteship/stage` — the verb / orchestration layer.

Core stays pure (nouns: the addressed `DocumentGraph` IR and its kernel).
Stage owns the verbs that CAST one graph to many carriers, reusing the
existing casters (`CSSCompiler`, the astro adaptive helpers, `VideoRenderer`)
and the one identity kernel (`CanonicalCbor` → `AddressedDigest`). Its jewel
is [dualExport](functions/dualExport.md): prove one source graph casts to a static Astro page AND
a video, both derived from the same `DocumentGraph.digest`, joined under one
parent merge receipt.

## Interfaces

- [DualExportNodeResult](interfaces/DualExportNodeResult.md)
- [DualExportResult](interfaces/DualExportResult.md)
- [EncodedVideo](interfaces/EncodedVideo.md)
- [EncodedVideoExport](interfaces/EncodedVideoExport.md)
- [MotionFrameSample](interfaces/MotionFrameSample.md)
- [MotionTrackExport](interfaces/MotionTrackExport.md)
- [VideoEncodeConfig](interfaces/VideoEncodeConfig.md)

## Type Aliases

- [FrameEncoder](type-aliases/FrameEncoder.md)

## Functions

- [dualExport](functions/dualExport.md)
- [dualExportNode](functions/dualExportNode.md)
- [exportAstroPage](functions/exportAstroPage.md)
- [exportMotionTrack](functions/exportMotionTrack.md)
- [exportVideo](functions/exportVideo.md)
- [exportVideoEncoded](functions/exportVideoEncoded.md)
- [sampleMotionFrames](functions/sampleMotionFrames.md)
