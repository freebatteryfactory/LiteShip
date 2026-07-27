[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / SceneSeedParts

# Variable: SceneSeedParts

> `const` **SceneSeedParts**: readonly \[`Part`\<`string`, `"trackId"`, `string`\>, `Part`\<`unknown`, `"VideoSource"`, `unknown`\>, `Part`\<`string`, `"AudioSource"`, `string`\>, `Part`\<[`FrameRange`](../interfaces/FrameRange.md), `"FrameRange"`, \{ `from`: `number`; `to`: `number`; \}\>, `Part`\<`number`, `"TrackLayer"`, `number`\>, `Part`\<\{ `curve`: `"linear-in"`; `spanFrames`: `number`; \} \| \{ `curve`: `"linear-out"`; `spanFrames`: `number`; \} \| \{ `amplitude`: `number`; `curve`: `"pulse"`; `periodFrames`: `number`; \}, `"Envelope"`, \{ `curve`: `"linear-in"`; `spanFrames`: `number`; \} \| \{ `curve`: `"linear-out"`; `spanFrames`: `number`; \} \| \{ `amplitude`: `number`; `curve`: `"pulse"`; `periodFrames`: `number`; \}\>, `Part`\<`number`, `"Volume"`, `number`\>, `Part`\<`number`, `"Pan"`, `number`\>, `Part`\<\{ `bpm`: `number`; \}, `"SyncBeatMarker"`, \{ `bpm`: `number`; \}\>, `Part`\<`"crossfade"` \| `"swipe.left"` \| `"swipe.right"` \| `"zoom.in"` \| `"zoom.out"` \| `"cut"`, `"TransitionKind"`, `"crossfade"` \| `"swipe.left"` \| `"swipe.right"` \| `"zoom.in"` \| `"zoom.out"` \| `"cut"`\>, `Part`\<readonly \[`string`, `string`\], `"Between"`, readonly \[`string`, `string`\]\>, `Part`\<`"cubic"` \| `"spring"` \| `"bounce"` \| \{ `stepped`: `number`; \}, `"Ease"`, `"cubic"` \| `"spring"` \| `"bounce"` \| \{ `stepped`: `number`; \}\>, `Part`\<`"pulse"` \| `"glow"` \| `"shake"` \| `"zoom"` \| `"desaturate"`, `"EffectKind"`, `"pulse"` \| `"glow"` \| `"shake"` \| `"zoom"` \| `"desaturate"`\>, `Part`\<`string`, `"TargetEntity"`, `string`\>, `Part`\<\{ `anchor`: `string`; `mode`: `"beat"` \| `"onset"` \| `"peak"`; \}, `"SyncAnchor"`, \{ `anchor`: `string`; `mode`: `"beat"` \| `"onset"` \| `"peak"`; \}\>, `Part`\<\{ `_tag`: `"beat"`; `anchorTrackId?`: `string`; `strength`: `number`; `timeMs`: `number`; \}, `"Beat"`, \{ `_tag`: `"beat"`; `anchorTrackId?`: `string`; `strength`: `number`; `timeMs`: `number`; \}\>, `Part`\<[`RuntimeWritePlan`](../../../liteship/src/motion/interfaces/RuntimeWritePlan.md), `"RuntimeWritePlan"`, `unknown`\>\]

Defined in: [scene/src/parts.ts:196](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/parts.ts#L196)

Parts that may cross the pure compile/runtime admission seam. System-owned
outputs are deliberately absent: they can only be produced by a declared
system write, never planted in a compiled scene seed.
