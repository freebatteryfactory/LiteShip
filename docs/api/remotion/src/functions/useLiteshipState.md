[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [remotion/src](../README.md) / useLiteshipState

# Function: useLiteshipState()

> **useLiteshipState**(): [`CompositeState`](../../../liteship/src/media/interfaces/CompositeState.md)

Defined in: [remotion/src/composition.ts:149](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/remotion/src/composition.ts#L149)

Hook that reads the `CompositeState` for the current Remotion frame
from the nearest [Provider](Provider.md). Returns a structurally-empty state
when no provider is mounted (or it holds no frames) so callers never
crash at the boundary; a warn-once diagnostic names the missing
`<Provider frames={...}>` so the unstyled render is not silent.

This is the implicit context-lookup half of a deliberate pair: mount a
[Provider](Provider.md) once and call `useLiteshipState()` anywhere in the subtree
— no prop threading. Its sibling, `useCompositeState(frames)` in
`hooks.js`, takes the frames array explicitly for shallow trees and
pure components. Both clamp to the valid frame range and fall back to a
structurally-empty `CompositeState`.

## Returns

[`CompositeState`](../../../liteship/src/media/interfaces/CompositeState.md)

## See

useCompositeState for the explicit prop-threading form.
