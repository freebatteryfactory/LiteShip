[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [stage/src](../README.md) / dualExportNode

# Function: dualExportNode()

> **dualExportNode**(`graph`, `encode`): `Promise`\<[`DualExportNodeResult`](../interfaces/DualExportNodeResult.md)\>

Defined in: [stage/src/dual-export.ts:605](https://github.com/heyoub/LiteShip/blob/main/packages/stage/src/dual-export.ts#L605)

THE JEWEL, HEADLESS. Run the full [dualExport](dualExport.md) proof in node/CI AND run a
REAL byte-encode through the injected [FrameEncoder](../type-aliases/FrameEncoder.md) so a node caller gets
a genuine MP4 — not a browser-gated one.

Determinism / invariant: the dual-export PROOF is taken verbatim from
[dualExport](dualExport.md), whose video carrier content-addresses the produced FRAMES
(NOT the encoded bytes). The byte-encode is the INJECTED seam and rides
alongside as `encoded`/`bytesDigest`; it never touches the proof's frame digest.
Both `dualExport(graph)` and `produceVideoFrames(graph)` walk the SAME graph
deterministically, so the frames the proof addresses are exactly the frames the
encoder receives — the page-digest == video-source-digest assertion holds
headless, identical to the browser path.

Stage's core imports no codec: `encode` is injected. In node, wire
`ffmpegFrameEncoder()` from `@czap/stage/ffmpeg` (env-gate with
`ffmpegEncodeAvailable()` first); in a browser wrapper, wire WebCodecs.

## Parameters

### graph

[`DocumentGraph`](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/document-graph.ts)

### encode

[`FrameEncoder`](../type-aliases/FrameEncoder.md)

## Returns

`Promise`\<[`DualExportNodeResult`](../interfaces/DualExportNodeResult.md)\>

## Example

```ts
import { dualExportNode } from '@czap/stage';
import { ffmpegFrameEncoder, ffmpegEncodeAvailable } from '@czap/stage/ffmpeg';

if (ffmpegEncodeAvailable()) {
  const r = await dualExportNode(graph, ffmpegFrameEncoder());
  // r.encoded.bytes is a real, ffprobe-validatable MP4
  // r.sharedSourceDigest === graph.digest — the proof still holds headless
}
```
