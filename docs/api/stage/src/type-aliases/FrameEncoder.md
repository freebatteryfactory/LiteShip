[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [stage/src](../README.md) / FrameEncoder

# Type Alias: FrameEncoder

> **FrameEncoder** = (`frames`, `config`) => `Promise`\<[`EncodedVideo`](../interfaces/EncodedVideo.md)\>

Defined in: [stage/src/dual-export.ts:89](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L89)

The byte-encode seam: turn the produced per-frame [CompositeState](../../../liteship/src/media/interfaces/CompositeState.md)
snapshots into real encoded video bytes. Stage's CORE owns no encoder — this
is INJECTED at the call site so the pure graph-walk never imports a codec:

The shipped implementation is the node/headless ffmpeg child-process adapter
in `./ffmpeg-encoder`. Other hosts may implement this exact
CompositeState-to-bytes contract, but `@liteship/web`'s canvas capture API is
a distinct renderer contract and is not presented as this type.

## Parameters

### frames

readonly [`CompositeState`](../../../liteship/src/media/interfaces/CompositeState.md)[]

### config

[`VideoEncodeConfig`](../interfaces/VideoEncodeConfig.md)

## Returns

`Promise`\<[`EncodedVideo`](../interfaces/EncodedVideo.md)\>
