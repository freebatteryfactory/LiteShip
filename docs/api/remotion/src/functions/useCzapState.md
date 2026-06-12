[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [remotion/src](../README.md) / useCzapState

# Function: useCzapState()

> **useCzapState**(): `CompositeState`

Defined in: [remotion/src/composition.ts:135](https://github.com/heyoub/LiteShip/blob/main/packages/remotion/src/composition.ts#L135)

Hook that reads the `CompositeState` for the current Remotion frame
from the nearest [Provider](Provider.md). Returns a structurally-empty state
when no provider is mounted (or it holds no frames) so callers never
crash at the boundary; a warn-once diagnostic names the missing
`<Provider frames={...}>` so the unstyled render is not silent.

This is the implicit context-lookup half of a deliberate pair: mount a
[Provider](Provider.md) once and call `useCzapState()` anywhere in the subtree
— no prop threading. Its sibling, `useCompositeState(frames)` in
`hooks.js`, takes the frames array explicitly for shallow trees and
pure components. Both clamp to the valid frame range and fall back to a
structurally-empty `CompositeState`.

## Returns

`CompositeState`

## See

useCompositeState for the explicit prop-threading form.
