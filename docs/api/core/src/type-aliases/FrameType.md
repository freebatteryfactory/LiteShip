[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / FrameType

# Type Alias: FrameType

> **FrameType** = `"keyframe"` \| `"delta"` \| `"interpolated"`

Defined in: [core/src/gen-frame.ts:30](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/gen-frame.ts#L30)

Classification of a [UIFrame](../interfaces/UIFrame.md) in the generative-UI pipeline, analogous to
I/P/B frames in video: `keyframe` replaces, `delta` patches, `interpolated`
keeps the DOM still and animates via CSS only.
