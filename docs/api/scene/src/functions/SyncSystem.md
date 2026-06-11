[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / SyncSystem

# Function: SyncSystem()

> **SyncSystem**(`frameIndex`, `fps?`): `SystemShape`

Defined in: [scene/src/systems/sync.ts:48](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/systems/sync.ts#L48)

Build a SyncSystem keyed to a frame index. Resolves the current scene
time from `frameIndex / fps`, queries the world for `Beat`-tagged
entities, picks the most recent beat at-or-before the current time,
and writes `_intensity = exp(-msSinceBeat / 250)` onto every
SyncAnchor entity. When the entity also carries `Envelope` +
`FrameRange` components (an effect track declaring both `syncTo`
and `envelope`), the decay is multiplied by the envelope factor —
sync sets the base, the envelope modulates it (see module docblock).

## Parameters

### frameIndex

`number`

— current frame number, supplied by the runtime per tick

### fps?

`number` = `60`

— scene frames per second; defaults to 60 for parity with VideoSystem

## Returns

`SystemShape`
