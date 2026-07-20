[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [remotion/src](../README.md) / precomputeFrames

# Function: precomputeFrames()

> **precomputeFrames**(`renderer`): `Promise`\<readonly [`VideoFrameOutput`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/interfaces/VideoFrameOutput.md)[]\>

Defined in: [remotion/src/composition.ts:35](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/remotion/src/composition.ts#L35)

Precompute every [VideoFrameOutput](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/interfaces/VideoFrameOutput.md) from a `VideoRenderer` into
an in-memory array.

Call this once on the server (or in a Remotion `calculateMetadata`) before
rendering so compositions can index the result by frame number without
re-invoking the renderer. The returned array's length is the renderer's
total frame count.

## Parameters

### renderer

`VideoRendererShape`

A `VideoRenderer` produced by `@liteship/core`.

## Returns

`Promise`\<readonly [`VideoFrameOutput`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/interfaces/VideoFrameOutput.md)[]\>

Frames in timeline order.

## Example

```ts
const frames = await precomputeFrames(renderer);
```
