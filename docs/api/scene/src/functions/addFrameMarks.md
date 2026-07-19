[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / addFrameMarks

# Function: addFrameMarks()

> **addFrameMarks**(`a`, `b`): `FrameMark`

Defined in: [scene/src/sugar/beat.ts:66](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/sugar/beat.ts#L66)

Add two [FrameMark](../type-aliases/FrameMark.md)s without resolving them — frame-space and
beat-space portions accumulate independently so resolution can stay
deferred to `compileScene` (which knows the scene's BPM/fps). The
result is renormalized to the narrowest representation: a plain
number when no beats are involved, a [BeatHandle](../type-aliases/BeatHandle.md) when no raw
frames are involved, and a [FrameMarkSum](../type-aliases/FrameMarkSum.md) only for mixed units.

## Parameters

### a

`FrameMark`

### b

`FrameMark`

## Returns

`FrameMark`
