[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/runtime](../README.md) / captureVideo

# Function: captureVideo()

> **captureVideo**(`renderer`, `capture`, `renderFn?`): `Promise`\<[`CaptureResult`](../../evidence/interfaces/CaptureResult.md)\>

Defined in: web/dist/capture/pipeline.d.ts:22

Capture a video from a VideoRenderer using a FrameCapture backend.

## Parameters

### renderer

`VideoRendererShape`

The VideoRenderer producing deterministic frames

### capture

[`FrameCapture`](../../evidence/interfaces/FrameCapture.md)

The owned FrameCapture consumed and disposed by this operation

### renderFn?

[`RenderFn`](../type-aliases/RenderFn.md)

Optional custom render function for canvas rendering

## Returns

`Promise`\<[`CaptureResult`](../../evidence/interfaces/CaptureResult.md)\>

The finalized CaptureResult with the encoded video blob
