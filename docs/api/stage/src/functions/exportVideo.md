[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [stage/src](../README.md) / exportVideo

# Function: exportVideo()

> **exportVideo**(`graph`): [`ExportNode`](../../../liteship/src/graph/interfaces/ExportNode.md)

Defined in: [stage/src/dual-export.ts:411](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L411)

Cast the graph's Pose/Projection-derived state to a deterministic video,
content-addressing the produced per-frame `CompositeState` snapshots (NOT the
encoded bytes). For the REAL byte-encode use [exportVideoEncoded](exportVideoEncoded.md) with
an injected [FrameEncoder](../type-aliases/FrameEncoder.md) (the shipped implementation is the ffmpeg
adapter in `./ffmpeg-encoder`). This frame-level cast
stays sync + codec-free so the dual-export proof never depends on a codec.

## Parameters

### graph

[`DocumentGraph`](../../../liteship/src/graph/interfaces/DocumentGraph.md)

## Returns

[`ExportNode`](../../../liteship/src/graph/interfaces/ExportNode.md)
