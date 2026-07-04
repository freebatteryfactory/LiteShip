[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [remotion/src](../README.md) / rendererFromRemotionConfig

# Function: rendererFromRemotionConfig()

> **rendererFromRemotionConfig**(`config`, `compositor`, `signal?`): `VideoRendererShape`

Defined in: [remotion/src/composition.ts:75](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/remotion/src/composition.ts#L75)

Build a `VideoRenderer` directly from Remotion's video config so timing is
declared exactly once — in Remotion.

Hand-building `VideoConfig` duplicates fps/duration that Remotion already
knows; when the two copies drift, the rendered video silently freezes on
the last precomputed frame. This helper derives
`durationMs = durationInFrames / fps * 1000`, so drift is impossible.

## Parameters

### config

[`RemotionVideoConfig`](../interfaces/RemotionVideoConfig.md)

Remotion's video config (`useVideoConfig()` /
  `calculateMetadata` output).

### compositor

`CompositorShape`

The `Compositor` driving the czap state pipeline.

### signal?

`Controllable`\<`number`\>

Optional controllable time signal, seeked per frame.

## Returns

`VideoRendererShape`

A `VideoRenderer.Shape` ready for [precomputeFrames](precomputeFrames.md).

## Example

```ts
const renderer = rendererFromRemotionConfig(videoConfig, compositor);
const frames = await precomputeFrames(renderer);
```
