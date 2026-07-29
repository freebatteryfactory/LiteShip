[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [web/src](../README.md) / captureVideo

# Function: captureVideo()

> **captureVideo**(`renderer`, `capture`, `renderFn?`): `Promise`\<[`CaptureResult`](../../../liteship/src/evidence/interfaces/CaptureResult.md)\>

Defined in: [web/src/capture/pipeline.ts:58](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/capture/pipeline.ts#L58)

Capture a video from a VideoRenderer using a FrameCapture backend.

## Parameters

### renderer

`VideoRendererShape`

The VideoRenderer producing deterministic frames

### capture

[`FrameCapture`](../../../liteship/src/evidence/interfaces/FrameCapture.md)

The owned FrameCapture consumed and disposed by this operation

### renderFn?

[`RenderFn`](../type-aliases/RenderFn.md)

Optional custom render function for canvas rendering

## Returns

`Promise`\<[`CaptureResult`](../../../liteship/src/evidence/interfaces/CaptureResult.md)\>

The finalized CaptureResult with the encoded video blob
