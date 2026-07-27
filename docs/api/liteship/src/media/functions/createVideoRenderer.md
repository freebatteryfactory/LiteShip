[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/media](../README.md) / createVideoRenderer

# Function: createVideoRenderer()

> **createVideoRenderer**(`config`, `compositor`, `signal?`): `VideoRendererShape`

Defined in: core/dist/media/video.d.ts:93

Create a video renderer that produces deterministic frames from a Compositor.

Each call to `frames()` returns an async generator yielding one
`VideoFrameOutput` per frame at the configured fps/duration.

When a `signal` is provided it is seeked to each frame's timestamp before
the compositor evaluates, so quantizers that read from that signal advance
deterministically with the render clock.

## Parameters

### config

[`VideoConfig`](../interfaces/VideoConfig.md)

### compositor

`CompositorShape`

### signal?

[`Controllable`](../../reactive/namespaces/Signal/type-aliases/Controllable.md)\<`number`\>

## Returns

`VideoRendererShape`
