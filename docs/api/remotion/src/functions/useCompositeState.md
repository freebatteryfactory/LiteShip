[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [remotion/src](../README.md) / useCompositeState

# Function: useCompositeState()

> **useCompositeState**(`frames`): `CompositeState`

Defined in: [remotion/src/hooks.ts:101](https://github.com/heyoub/LiteShip/blob/main/packages/remotion/src/hooks.ts#L101)

Remotion-aware hook that returns the `CompositeState` for the current
frame. Internally calls Remotion's `useCurrentFrame` and defers to
[stateAtFrame](stateAtFrame.md) for lookup.

This is the explicit prop-threading half of a deliberate pair: pass the
`frames` array directly — pure, no provider required. Its sibling,
`Provider` + `useCzapState()` in `composition.js`, resolves the same
state via implicit context lookup for deep component trees. Both clamp
to the valid frame range and fall back to a structurally-empty
`CompositeState`.

## Parameters

### frames

readonly [`VideoFrameOutput`](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/interfaces/VideoFrameOutput.md)[]

Precomputed frames (see [precomputeFrames](precomputeFrames.md)).

## Returns

`CompositeState`

State for the current Remotion frame.

## See

useCzapState for the context-lookup form (no prop threading).

## Example

```tsx
import { cssVarsFromState, useCompositeState } from '@czap/remotion';

function MyComposition({ frames }: { frames: VideoFrameOutput[] }) {
  const state = useCompositeState(frames);
  const vars = cssVarsFromState(state);
  return <div style={vars}>...</div>;
}
```
