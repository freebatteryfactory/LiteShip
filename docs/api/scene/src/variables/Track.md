[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / Track

# Variable: Track

> `const` **Track**: `object`

Defined in: [scene/src/track.ts:143](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/track.ts#L143)

Track namespace — typed constructors for the four track kinds plus
per-kind id minters (Track.videoId, Track.audioId, Track.transitionId,
Track.effectId) for use in cross-track references.

## Type Declaration

### audio

> **audio**: (`id`, `opts`) => [`AudioTrack`](../interfaces/AudioTrack.md)

Build an AudioTrack referencing an asset id, with default mix { volume: 1, pan: 0 } (unity linear gain, centered) and optional gain envelope.

#### Parameters

##### id

`string`

##### opts

###### envelope?

`TrackEnvelope`

###### from

`FrameMark`

###### mix?

\{ `pan?`: `number`; `sync?`: \{ `bpm?`: `number`; \}; `volume?`: `number`; \}

###### mix.pan?

`number`

Stereo position, -1 (left) .. 1 (right).

**Default Value**

```ts
0
```

###### mix.sync?

\{ `bpm?`: `number`; \}

###### mix.sync.bpm?

`number`

###### mix.volume?

`number`

Linear gain multiplier — 1 is unity (asset plays at its authored
level), 0 is silence. Mixers multiply this by the envelope-driven
`_gain` factor each tick (see `systems/audio.ts`).

**Default Value**

```ts
1
```

###### source

`string`

###### to

`FrameMark`

#### Returns

[`AudioTrack`](../interfaces/AudioTrack.md)

### audioId

> **audioId**: (`id`) => [`TrackId`](../type-aliases/TrackId.md)\<`"audio"`\>

Mint an audio TrackId — the one sanctioned cast site for the 'audio' brand.

#### Parameters

##### id

`string`

#### Returns

[`TrackId`](../type-aliases/TrackId.md)\<`"audio"`\>

### effect

> **effect**: (`id`, `opts`) => [`EffectTrack`](../interfaces/EffectTrack.md)

Build an EffectTrack applying an intensity curve to a target video, optionally synced to audio. `target` / `syncTo.anchor` accept track objects or ids.

#### Parameters

##### id

`string`

##### opts

###### envelope?

`TrackEnvelope`

###### from

`FrameMark`

###### kind

`"pulse"` \| `"glow"` \| `"shake"` \| `"zoom"` \| `"desaturate"`

###### syncTo?

\{ `anchor`: [`TrackRef`](../type-aliases/TrackRef.md)\<`"audio"`\>; `mode`: `"beat"` \| `"onset"` \| `"peak"`; \}

###### syncTo.anchor

[`TrackRef`](../type-aliases/TrackRef.md)\<`"audio"`\>

###### syncTo.mode

`"beat"` \| `"onset"` \| `"peak"`

###### target

[`TrackRef`](../type-aliases/TrackRef.md)\<`"video"`\>

###### to

`FrameMark`

#### Returns

[`EffectTrack`](../interfaces/EffectTrack.md)

### effectId

> **effectId**: (`id`) => [`TrackId`](../type-aliases/TrackId.md)\<`"effect"`\>

Mint an effect TrackId — the one sanctioned cast site for the 'effect' brand.

#### Parameters

##### id

`string`

#### Returns

[`TrackId`](../type-aliases/TrackId.md)\<`"effect"`\>

### transition

> **transition**: (`id`, `opts`) => [`TransitionTrack`](../interfaces/TransitionTrack.md)

Build a TransitionTrack blending two target tracks over a frame window, with optional named easing. `between` accepts track objects or ids.

#### Parameters

##### id

`string`

##### opts

###### between

readonly \[[`TrackRef`](../type-aliases/TrackRef.md)\<`"video"`\>, [`TrackRef`](../type-aliases/TrackRef.md)\<`"video"`\>\]

###### ease?

`EaseTag`

###### from

`FrameMark`

###### kind

`"crossfade"` \| `"swipe.left"` \| `"swipe.right"` \| `"zoom.in"` \| `"zoom.out"` \| `"cut"`

###### to

`FrameMark`

#### Returns

[`TransitionTrack`](../interfaces/TransitionTrack.md)

### transitionId

> **transitionId**: (`id`) => [`TrackId`](../type-aliases/TrackId.md)\<`"transition"`\>

Mint a transition TrackId — the one sanctioned cast site for the 'transition' brand.

#### Parameters

##### id

`string`

#### Returns

[`TrackId`](../type-aliases/TrackId.md)\<`"transition"`\>

### video

> **video**: (`id`, `opts`) => [`VideoTrack`](../interfaces/VideoTrack.md)

Build a VideoTrack referencing a quantizer source, with optional layer and opacity envelope.

#### Parameters

##### id

`string`

##### opts

###### envelope?

`TrackEnvelope`

###### from

`FrameMark`

###### layer?

`number`

###### source

`unknown`

###### to

`FrameMark`

#### Returns

[`VideoTrack`](../interfaces/VideoTrack.md)

### videoId

> **videoId**: (`id`) => [`TrackId`](../type-aliases/TrackId.md)\<`"video"`\>

Mint a video TrackId — the one sanctioned cast site for the 'video' brand.

#### Parameters

##### id

`string`

#### Returns

[`TrackId`](../type-aliases/TrackId.md)\<`"video"`\>
