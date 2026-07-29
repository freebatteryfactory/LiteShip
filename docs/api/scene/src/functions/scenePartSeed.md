[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [scene/src](../README.md) / scenePartSeed

# Function: scenePartSeed()

> **scenePartSeed**\<`P`\>(`part`, `value`): [`ScenePartSeed`](../type-aliases/ScenePartSeed.md)

Defined in: [scene/src/parts.ts:230](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/parts.ts#L230)

Build a typed seed from a canonical Scene Part. Host-reference Parts remain references.

## Type Parameters

### P

`P` *extends* `Part`\<`string`, `"trackId"`, `string`\> \| `Part`\<`unknown`, `"VideoSource"`, `unknown`\> \| `Part`\<`string`, `"AudioSource"`, `string`\> \| `Part`\<[`FrameRange`](../interfaces/FrameRange.md), `"FrameRange"`, \{ `from`: `number`; `to`: `number`; \}\> \| `Part`\<`number`, `"TrackLayer"`, `number`\> \| `Part`\<\{ `curve`: `"linear-in"`; `spanFrames`: `number`; \} \| \{ `curve`: `"linear-out"`; `spanFrames`: `number`; \} \| \{ `amplitude`: `number`; `curve`: `"pulse"`; `periodFrames`: `number`; \}, `"Envelope"`, \{ `curve`: `"linear-in"`; `spanFrames`: `number`; \} \| \{ `curve`: `"linear-out"`; `spanFrames`: `number`; \} \| \{ `amplitude`: `number`; `curve`: `"pulse"`; `periodFrames`: `number`; \}\> \| `Part`\<`number`, `"Volume"`, `number`\> \| `Part`\<`number`, `"Pan"`, `number`\> \| `Part`\<\{ `bpm`: `number`; \}, `"SyncBeatMarker"`, \{ `bpm`: `number`; \}\> \| `Part`\<`"crossfade"` \| `"swipe.left"` \| `"swipe.right"` \| `"zoom.in"` \| `"zoom.out"` \| `"cut"`, `"TransitionKind"`, `"crossfade"` \| `"swipe.left"` \| `"swipe.right"` \| `"zoom.in"` \| `"zoom.out"` \| `"cut"`\> \| `Part`\<readonly \[`string`, `string`\], `"Between"`, readonly \[`string`, `string`\]\> \| `Part`\<`"cubic"` \| `"spring"` \| `"bounce"` \| \{ `stepped`: `number`; \}, `"Ease"`, `"cubic"` \| `"spring"` \| `"bounce"` \| \{ `stepped`: `number`; \}\> \| `Part`\<`"pulse"` \| `"glow"` \| `"shake"` \| `"zoom"` \| `"desaturate"`, `"EffectKind"`, `"pulse"` \| `"glow"` \| `"shake"` \| `"zoom"` \| `"desaturate"`\> \| `Part`\<`string`, `"TargetEntity"`, `string`\> \| `Part`\<\{ `anchor`: `string`; `mode`: `"beat"` \| `"onset"` \| `"peak"`; \}, `"SyncAnchor"`, \{ `anchor`: `string`; `mode`: `"beat"` \| `"onset"` \| `"peak"`; \}\> \| `Part`\<\{ `_tag`: `"beat"`; `anchorTrackId?`: `string`; `strength`: `number`; `timeMs`: `number`; \}, `"Beat"`, \{ `_tag`: `"beat"`; `anchorTrackId?`: `string`; `strength`: `number`; `timeMs`: `number`; \}\> \| `Part`\<[`RuntimeWritePlan`](../../../liteship/src/motion/interfaces/RuntimeWritePlan.md), `"RuntimeWritePlan"`, `unknown`\>

## Parameters

### part

`P`

### value

`PartValue`\<`P`\>

## Returns

[`ScenePartSeed`](../type-aliases/ScenePartSeed.md)
