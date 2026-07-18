[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [stage/src](../README.md) / exportVideo

# Function: exportVideo()

> **exportVideo**(`graph`, `encode?`): [`ExportNode`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts)

Defined in: [stage/src/dual-export.ts:379](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L379)

Cast the graph's Pose/Projection-derived state to a deterministic video,
content-addressing the produced per-frame `CompositeState` snapshots (NOT the
encoded bytes). For the REAL byte-encode use [exportVideoEncoded](exportVideoEncoded.md) with
an injected [FrameEncoder](../type-aliases/FrameEncoder.md) (headless: the ffmpeg adapter in
`./ffmpeg-encoder`; browser: WebCodecs `captureVideo`). This frame-level cast
stays sync + codec-free so the dual-export proof never depends on a codec.

## Parameters

### graph

[`DocumentGraph`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts)

### encode?

(`renderer`, `capture`, `renderFn?`) => `Promise`\<`CaptureResult`\>

## Returns

[`ExportNode`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts)
