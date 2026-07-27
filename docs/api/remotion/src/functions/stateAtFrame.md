[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [remotion/src](../README.md) / stateAtFrame

# Function: stateAtFrame()

> **stateAtFrame**(`frames`, `frameIndex`): [`CompositeState`](../../../liteship/src/media/interfaces/CompositeState.md)

Defined in: [remotion/src/hooks.ts:63](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/remotion/src/hooks.ts#L63)

Look up the `CompositeState` for a given frame index from precomputed
frames.

Clamps to valid range: negative indices return the first frame; indices
past the end return the last frame. An empty `frames` array yields a
structurally-empty `CompositeState` so callers never have to guard for
undefined output. Both degraded paths emit a warn-once diagnostic
(overflow usually means fps/durationMs drifted from `durationInFrames`).

## Parameters

### frames

readonly [`VideoFrameOutput`](../../../liteship/src/media/interfaces/VideoFrameOutput.md)[]

Output of [precomputeFrames](precomputeFrames.md).

### frameIndex

`number`

Zero-based frame index (typically from Remotion's
  `useCurrentFrame`).

## Returns

[`CompositeState`](../../../liteship/src/media/interfaces/CompositeState.md)

The state at the clamped frame.

## Example

```ts
const state = stateAtFrame(frames, 42);
```
