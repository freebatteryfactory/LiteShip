[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/media](../README.md) / FrameType

# Type Alias: FrameType

> **FrameType** = `"keyframe"` \| `"delta"` \| `"interpolated"`

Defined in: core/dist/media/gen-frame.d.ts:22

Classification of a [UIFrame](../interfaces/UIFrame.md) in the generative-UI pipeline, analogous to
I/P/B frames in video: `keyframe` replaces, `delta` patches, `interpolated`
keeps the DOM still and animates via CSS only.
