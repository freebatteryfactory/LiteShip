[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [stage/src](../README.md) / exportVideoEncoded

# Function: exportVideoEncoded()

> **exportVideoEncoded**(`graph`, `encode`): `Promise`\<[`EncodedVideoExport`](../interfaces/EncodedVideoExport.md)\>

Defined in: [stage/src/dual-export.ts:427](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L427)

Cast the graph to a video AND run a REAL byte-encode through the injected
[FrameEncoder](../type-aliases/FrameEncoder.md). Produces the same frame stream as [exportVideo](exportVideo.md),
hands it to the encoder (ffmpeg headless, or WebCodecs in a browser wrapper),
and folds the encoded bytes' content address into the export node's
`artifactDigest`. Stage's core imports no codec — `encode` is injected.

This is the headless byte path made HONEST: the returned `encoded.bytes` are
a real container (a validatable MP4 when the ffmpeg adapter is used), and the
node's digest is a content address OF those bytes, not just the frames.

## Parameters

### graph

[`DocumentGraph`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts)

### encode

[`FrameEncoder`](../type-aliases/FrameEncoder.md)

## Returns

`Promise`\<[`EncodedVideoExport`](../interfaces/EncodedVideoExport.md)\>
