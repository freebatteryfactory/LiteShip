[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / SceneParts

# Variable: SceneParts

> `const` **SceneParts**: `object`

Defined in: [scene/src/parts.ts:160](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/parts.ts#L160)

Every Scene-owned Part, indexed by its stable wire/seed identity.

## Type Declaration

### \_blend

> `readonly` **\_blend**: `Part`\<`number`, `"_blend"`, `number`\> = `BlendPart`

### \_gain

> `readonly` **\_gain**: `Part`\<`number`, `"_gain"`, `number`\> = `GainPart`

### \_intensity

> `readonly` **\_intensity**: `Part`\<`number`, `"_intensity"`, `number`\> = `IntensityPart`

### \_opacity

> `readonly` **\_opacity**: `Part`\<`number`, `"_opacity"`, `number`\> = `OpacityPart`

### \_phase

> `readonly` **\_phase**: `Part`\<`number`, `"_phase"`, `number`\> = `PhasePart`

### \_svgAttrs

> `readonly` **\_svgAttrs**: `Part`\<\{ `_tag`: `"SvgAttrs"`; `clipPath?`: `string`; `mixBlendMode?`: `string`; `opacity?`: `number`; `transform?`: `string`; \}, `"_svgAttrs"`, \{ `_tag`: `"SvgAttrs"`; `clipPath?`: `string`; `mixBlendMode?`: `string`; `opacity?`: `number`; `transform?`: `string`; \}\> = `SvgAttrsPart`

### AudioSource

> `readonly` **AudioSource**: `Part`\<`string`, `"AudioSource"`, `string`\> = `AudioSourcePart`

### Beat

> `readonly` **Beat**: `Part`\<\{ `_tag`: `"beat"`; `anchorTrackId?`: `string`; `strength`: `number`; `timeMs`: `number`; \}, `"Beat"`, \{ `_tag`: `"beat"`; `anchorTrackId?`: `string`; `strength`: `number`; `timeMs`: `number`; \}\> = `BeatPart`

### Between

> `readonly` **Between**: `Part`\<readonly \[`string`, `string`\], `"Between"`, readonly \[`string`, `string`\]\> = `BetweenPart`

### Ease

> `readonly` **Ease**: `Part`\<`"cubic"` \| `"spring"` \| `"bounce"` \| \{ `stepped`: `number`; \}, `"Ease"`, `"cubic"` \| `"spring"` \| `"bounce"` \| \{ `stepped`: `number`; \}\> = `EasePart`

### EffectKind

> `readonly` **EffectKind**: `Part`\<`"pulse"` \| `"glow"` \| `"shake"` \| `"zoom"` \| `"desaturate"`, `"EffectKind"`, `"pulse"` \| `"glow"` \| `"shake"` \| `"zoom"` \| `"desaturate"`\> = `EffectKindPart`

### Envelope

> `readonly` **Envelope**: `Part`\<\{ `curve`: `"linear-in"`; `spanFrames`: `number`; \} \| \{ `curve`: `"linear-out"`; `spanFrames`: `number`; \} \| \{ `amplitude`: `number`; `curve`: `"pulse"`; `periodFrames`: `number`; \}, `"Envelope"`, \{ `curve`: `"linear-in"`; `spanFrames`: `number`; \} \| \{ `curve`: `"linear-out"`; `spanFrames`: `number`; \} \| \{ `amplitude`: `number`; `curve`: `"pulse"`; `periodFrames`: `number`; \}\> = `EnvelopePart`

### FrameRange

> `readonly` **FrameRange**: `Part`\<[`FrameRange`](../interfaces/FrameRange.md), `"FrameRange"`, \{ `from`: `number`; `to`: `number`; \}\> = `FrameRangePart`

### MotionSample

> `readonly` **MotionSample**: `Part`\<\{\[`k`: `string`\]: [`TypedValue`](../../../liteship/src/motion/type-aliases/TypedValue.md); \}, `"MotionSample"`, \{\[`k`: `string`\]: `unknown`; \}\> = `MotionSamplePart`

### Pan

> `readonly` **Pan**: `Part`\<`number`, `"Pan"`, `number`\> = `PanPart`

### RuntimeWritePlan

> `readonly` **RuntimeWritePlan**: `Part`\<[`RuntimeWritePlan`](../../../liteship/src/motion/interfaces/RuntimeWritePlan.md), `"RuntimeWritePlan"`, `unknown`\> = `RuntimeWritePlanPart`

### SyncAnchor

> `readonly` **SyncAnchor**: `Part`\<\{ `anchor`: `string`; `mode`: `"beat"` \| `"onset"` \| `"peak"`; \}, `"SyncAnchor"`, \{ `anchor`: `string`; `mode`: `"beat"` \| `"onset"` \| `"peak"`; \}\> = `SyncAnchorPart`

### SyncBeatMarker

> `readonly` **SyncBeatMarker**: `Part`\<\{ `bpm`: `number`; \}, `"SyncBeatMarker"`, \{ `bpm`: `number`; \}\> = `SyncBeatMarkerPart`

### TargetEntity

> `readonly` **TargetEntity**: `Part`\<`string`, `"TargetEntity"`, `string`\> = `TargetEntityPart`

### trackId

> `readonly` **trackId**: `Part`\<`string`, `"trackId"`, `string`\> = `TrackIdPart`

### TrackLayer

> `readonly` **TrackLayer**: `Part`\<`number`, `"TrackLayer"`, `number`\> = `TrackLayerPart`

### TransitionKind

> `readonly` **TransitionKind**: `Part`\<`"crossfade"` \| `"swipe.left"` \| `"swipe.right"` \| `"zoom.in"` \| `"zoom.out"` \| `"cut"`, `"TransitionKind"`, `"crossfade"` \| `"swipe.left"` \| `"swipe.right"` \| `"zoom.in"` \| `"zoom.out"` \| `"cut"`\> = `TransitionKindPart`

### VideoSource

> `readonly` **VideoSource**: `Part`\<`unknown`, `"VideoSource"`, `unknown`\> = `VideoSourcePart`

### Volume

> `readonly` **Volume**: `Part`\<`number`, `"Volume"`, `number`\> = `VolumePart`
