[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / FrameMark

# Type Alias: FrameMark

> **FrameMark** = `number` \| [`BeatHandle`](../interfaces/BeatHandle.md) \| [`FrameMarkSum`](../interfaces/FrameMarkSum.md)

Defined in: [\_spine/scene.d.ts:68](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/scene.d.ts#L68)

Timeline mark accepted by track `from` / `to` fields and
`Scene.include` offsets: a raw frame index, a `Beat(n)` handle, or a
deferred frame+beat sum. `compileScene` normalizes every mark to a
numeric frame index (via the scene's BPM + fps) before invariants run.
