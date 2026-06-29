[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / TrackRef

# Type Alias: TrackRef\<K\>

> **TrackRef**\<`K`\> = [`TrackId`](TrackId.md)\<`K`\> \| \{ `id`: [`TrackId`](TrackId.md)\<`K`\>; \}

Defined in: [scene/src/track.ts:33](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/track.ts#L33)

Cross-track reference: a phantom-kinded id, or the track object
itself — the id brand on the object's `id` field carries the same
kind, so cross-kind references still fail at compile time.

## Type Parameters

### K

`K` *extends* [`TrackKind`](TrackKind.md)
