[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / compositeStateToRgba

# Function: compositeStateToRgba()

> **compositeStateToRgba**(`state`, `width`, `height`): `Uint8Array`

Defined in: [core/src/video.ts:82](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/video.ts#L82)

Paint one [CompositeState](../interfaces/CompositeState.md) into a solid `width*height*4` RGBA buffer
whose color is a DETERMINISTIC function of the frame's discrete state + css
outputs.

This is the SINGLE source of truth for "frame state → pixels" shared by BOTH
headless byte-encoders — the `@czap/command` ffmpeg render backend that the
shipping `scene render` CLI drives, and the `@czap/stage` ffmpeg `FrameEncoder`.
Neither owns its own painter, so
the same `CompositeState` always yields byte-identical pixels regardless of
which path encoded it. It is HONEST, not a black stub: distinct frames (the
graph's poses crossing states over the timeline) yield distinct pixels, so the
encoded video genuinely VARIES with the graph state; re-encoding the same
frames yields byte-identical RGBA, so it is content-addressable and replayable.

The mix is a small FNV-1a over the canonical-ish (key, value) pairs of the
state's `discrete` map and its compiled `css` outputs — the two fields that
carry the per-frame pose. (A richer renderer can paint geometry later; the
`(state, w, h) → RGBA` seam shape is unchanged, so both backends move
together.)

## Parameters

### state

[`CompositeState`](../interfaces/CompositeState.md)

the per-frame compositor snapshot (the real pose at this tick).

### width

`number`

frame width in pixels.

### height

`number`

frame height in pixels.

## Returns

`Uint8Array`

a `width*height*4` RGBA byte buffer (alpha fully opaque).
