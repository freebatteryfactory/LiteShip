[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / liteship/src/media

# liteship/src/media

`liteship/media` — the curated facade over `@liteship/core/media`: the media +
compositor vocabulary. The video renderer, the AV bridge/renderer,
responsive-media resolution, the compositor + its state pool, generative UI
frames, the token buffer, and the frame budget. Curated named re-exports only —
no behavior lives here.

## Namespaces

- [AVBridge](namespaces/AVBridge/README.md)
- [AVRenderer](namespaces/AVRenderer/README.md)
- [Compositor](namespaces/Compositor/README.md)
- [GenFrame](namespaces/GenFrame/README.md)
- [TokenBuffer](namespaces/TokenBuffer/README.md)

## Interfaces

- [CompositeState](interfaces/CompositeState.md)
- [CompositorConfig](interfaces/CompositorConfig.md)
- [FrameSchedule](interfaces/FrameSchedule.md)
- [ResolvedResponsiveMedia](interfaces/ResolvedResponsiveMedia.md)
- [ResponsiveMediaCandidateSet](interfaces/ResponsiveMediaCandidateSet.md)
- [ResponsiveMediaCapabilities](interfaces/ResponsiveMediaCapabilities.md)
- [ResponsiveMediaIntent](interfaces/ResponsiveMediaIntent.md)
- [ResponsiveMediaIntentInput](interfaces/ResponsiveMediaIntentInput.md)
- [ResponsiveMediaPictureProjection](interfaces/ResponsiveMediaPictureProjection.md)
- [ResponsiveMediaVariant](interfaces/ResponsiveMediaVariant.md)
- [ScheduledFrame](interfaces/ScheduledFrame.md)
- [UIFrame](interfaces/UIFrame.md)
- [VideoConfig](interfaces/VideoConfig.md)
- [VideoFrameOutput](interfaces/VideoFrameOutput.md)

## Type Aliases

- [AVBridge](type-aliases/AVBridge.md)
- [AVRenderer](type-aliases/AVRenderer.md)
- [Compositor](type-aliases/Compositor.md)
- [CompositorStatePool](type-aliases/CompositorStatePool.md)
- [FrameBudget](type-aliases/FrameBudget.md)
- [FrameType](type-aliases/FrameType.md)
- [GapStrategy](type-aliases/GapStrategy.md)
- [GenFrame](type-aliases/GenFrame.md)
- [MorphStrategy](type-aliases/MorphStrategy.md)
- [Priority](type-aliases/Priority.md)
- [ResponsiveMediaResolutionReason](type-aliases/ResponsiveMediaResolutionReason.md)
- [TokenBuffer](type-aliases/TokenBuffer.md)
- [VideoRenderer](type-aliases/VideoRenderer.md)

## Variables

- [AVBridge](variables/AVBridge.md)
- [AVRenderer](variables/AVRenderer.md)
- [Compositor](variables/Compositor.md)
- [GenFrame](variables/GenFrame.md)
- [ResponsiveMedia](variables/ResponsiveMedia.md)

## Functions

- [buildResponsiveImageSet](functions/buildResponsiveImageSet.md)
- [buildResponsiveSrcset](functions/buildResponsiveSrcset.md)
- [compositeStateToRgba](functions/compositeStateToRgba.md)
- [createCompositorStatePool](functions/createCompositorStatePool.md)
- [createFrameBudget](functions/createFrameBudget.md)
- [createFrameSchedule](functions/createFrameSchedule.md)
- [createTokenBuffer](functions/createTokenBuffer.md)
- [createVideoRenderer](functions/createVideoRenderer.md)
- [projectResponsiveMediaPicture](functions/projectResponsiveMediaPicture.md)
- [resolveResponsiveMedia](functions/resolveResponsiveMedia.md)
- [selectCandidates](functions/selectCandidates.md)
