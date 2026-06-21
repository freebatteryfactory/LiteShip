[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / resolveBeatProjectionToSceneBeats

# Function: resolveBeatProjectionToSceneBeats()

> **resolveBeatProjectionToSceneBeats**(`input`): readonly `BeatComponent`[]

Defined in: [scene/src/beat-projection.ts:37](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/beat-projection.ts#L37)

Resolve a raw beat-marker projection into scene-ready beat components.

Each sample index becomes a millisecond timestamp via
`timeMs = sampleIndex / sampleRate * 1000`. Order and count are preserved
(one component per input beat), every marker is tagged `_tag: 'beat'`, and
`strength` is stamped deterministically (defaults to 1). When `anchorTrackId`
is supplied it is carried onto every marker; otherwise the field is omitted.

## Parameters

### input

`BeatProjectionResolutionInput`

## Returns

readonly `BeatComponent`[]

## Throws

RangeError if `sampleRate` is not a positive, finite number — a
zero/negative/NaN rate cannot define a timeline, so we fail loudly rather
than emit `Infinity`/`NaN` beat times.
