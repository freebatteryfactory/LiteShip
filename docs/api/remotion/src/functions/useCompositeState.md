[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [remotion/src](../README.md) / useCompositeState

# Function: useCompositeState()

> **useCompositeState**(`frames`): [`CompositeState`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/media/compositor-pool.ts)

Defined in: [remotion/src/hooks.ts:119](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/remotion/src/hooks.ts#L119)

Remotion-aware hook that returns the `CompositeState` for the current
frame. Internally calls Remotion's `useCurrentFrame` and defers to
[stateAtFrame](stateAtFrame.md) for lookup.

This is the explicit prop-threading half of a deliberate pair: pass the
`frames` array directly — pure, no provider required. Its sibling,
`Provider` + `useLiteshipState()` in `composition.js`, resolves the same
state via implicit context lookup for deep component trees. Both clamp
to the valid frame range and fall back to a structurally-empty
`CompositeState`.

## Parameters

### frames

readonly [`VideoFrameOutput`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/interfaces/VideoFrameOutput.md)[]

Precomputed frames (see [precomputeFrames](precomputeFrames.md)).

## Returns

[`CompositeState`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/media/compositor-pool.ts)

State for the current Remotion frame.

## See

useLiteshipState for the context-lookup form (no prop threading).

## Example

```tsx
import { cssVarsFromState, useCompositeState } from '@liteship/remotion';

function MyComposition({ frames }: { frames: VideoFrameOutput[] }) {
  const state = useCompositeState(frames);
  const vars = cssVarsFromState(state);
  return <div style={vars}>...</div>;
}
```
