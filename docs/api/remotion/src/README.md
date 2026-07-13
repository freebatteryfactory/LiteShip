[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / remotion/src

# remotion/src

`@czap/remotion` — **LiteShip** Remotion adapter: video timeline + shader
surfaces driven by `CompositeState` from the **CZAP** `VideoRenderer`.

Provides React hooks and composition helpers to consume
`CompositeState` from `@czap/core`'s `VideoRenderer` in Remotion projects.

Typical flow:
1. Build a [VideoRenderer.Shape](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/namespaces/VideoRenderer/type-aliases/Shape.md) on the server — usually via
   [rendererFromRemotionConfig](functions/rendererFromRemotionConfig.md), so fps/duration are declared once,
   in Remotion.
2. Call [precomputeFrames](functions/precomputeFrames.md) once before Remotion renders.
3. Inside a composition, read the current frame's state with
   [useCompositeState](functions/useCompositeState.md) (or [useCzapState](functions/useCzapState.md) if you wrap your
   tree in [Provider](functions/Provider.md)).
4. Turn the discrete state into CSS variables via [cssVarsFromState](functions/cssVarsFromState.md).

## Interfaces

- [RemotionVideoConfig](interfaces/RemotionVideoConfig.md)

## Variables

- [remotionAdapterCapsule](variables/remotionAdapterCapsule.md)

## Functions

- [cssVarsFromState](functions/cssVarsFromState.md)
- [motionCssVars](functions/motionCssVars.md)
- [precomputeFrames](functions/precomputeFrames.md)
- [Provider](functions/Provider.md)
- [rendererFromRemotionConfig](functions/rendererFromRemotionConfig.md)
- [sampleMotionFrame](functions/sampleMotionFrame.md)
- [stateAtFrame](functions/stateAtFrame.md)
- [useCompositeState](functions/useCompositeState.md)
- [useCzapState](functions/useCzapState.md)
