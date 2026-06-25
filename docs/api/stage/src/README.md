[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / stage/src

# stage/src

`@czap/stage` — the verb / orchestration layer.

Core stays pure (nouns: the addressed `DocumentGraph` IR and its kernel).
Stage owns the verbs that CAST one graph to many carriers, reusing the
existing casters (`CSSCompiler`, the astro satellite helpers, `VideoRenderer`)
and the one identity kernel (`CanonicalCbor` → `AddressedDigest`). Its jewel
is [dualExport](functions/dualExport.md): prove one source graph casts to a static Astro page AND
a video, both derived from the same `DocumentGraph.digest`, joined under one
parent merge receipt.

## Interfaces

- [DualExportNodeResult](interfaces/DualExportNodeResult.md)
- [DualExportResult](interfaces/DualExportResult.md)
- [EncodedVideo](interfaces/EncodedVideo.md)
- [EncodedVideoExport](interfaces/EncodedVideoExport.md)
- [VideoEncodeConfig](interfaces/VideoEncodeConfig.md)

## Type Aliases

- [FrameEncoder](type-aliases/FrameEncoder.md)

## Functions

- [dualExport](functions/dualExport.md)
- [dualExportNode](functions/dualExportNode.md)
- [exportAstroPage](functions/exportAstroPage.md)
- [exportVideo](functions/exportVideo.md)
- [exportVideoEncoded](functions/exportVideoEncoded.md)
