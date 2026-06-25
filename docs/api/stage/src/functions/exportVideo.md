[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [stage/src](../README.md) / exportVideo

# Function: exportVideo()

> **exportVideo**(`graph`, `encode?`): `ExportNode`

Defined in: [stage/src/dual-export.ts:355](https://github.com/heyoub/LiteShip/blob/main/packages/stage/src/dual-export.ts#L355)

Cast the graph's Pose/Projection-derived state to a deterministic video,
content-addressing the produced per-frame `CompositeState` snapshots (NOT the
encoded bytes). For the REAL byte-encode use [exportVideoEncoded](exportVideoEncoded.md) with
an injected [FrameEncoder](../type-aliases/FrameEncoder.md) (headless: the ffmpeg adapter in
`./ffmpeg-encoder`; browser: WebCodecs `captureVideo`). This frame-level cast
stays sync + codec-free so the dual-export proof never depends on a codec.

## Parameters

### graph

`DocumentGraph`

### encode?

(`renderer`, `capture`, `renderFn?`) => `Promise`\<`CaptureResult`\>

## Returns

`ExportNode`
