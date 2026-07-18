[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [stage/src](../README.md) / FrameEncoder

# Type Alias: FrameEncoder

> **FrameEncoder** = (`frames`, `config`) => `Promise`\<[`EncodedVideo`](../interfaces/EncodedVideo.md)\>

Defined in: [stage/src/dual-export.ts:95](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L95)

The byte-encode seam: turn the produced per-frame [CompositeState](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/compositor-pool.ts)
snapshots into real encoded video bytes. Stage's CORE owns no encoder — this
is INJECTED at the call site so the pure graph-walk never imports a codec:

 - browser/worker: WebCodecs over an OffscreenCanvas (`@czap/web` capture);
 - node/headless: the ffmpeg child-process adapter in `./ffmpeg-encoder`.

Both are real backends of this one shape; neither lives in `dual-export.ts`.

## Parameters

### frames

readonly [`CompositeState`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/compositor-pool.ts)[]

### config

[`VideoEncodeConfig`](../interfaces/VideoEncodeConfig.md)

## Returns

`Promise`\<[`EncodedVideo`](../interfaces/EncodedVideo.md)\>
