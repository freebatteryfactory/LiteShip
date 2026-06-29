[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / TrackId

# Type Alias: TrackId\<K\>

> **TrackId**\<`K`\> = `_TrackId`\<`K`\>

Defined in: [scene/src/contract.ts:32](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/contract.ts#L32)

Phantom-kinded track identifier — `K` discriminates between video,
audio, transition, and effect. Cross-kind assignment fails at compile
time, so e.g. `syncTo.beat(videoId)` is a type error.

## Type Parameters

### K

`K` *extends* [`TrackKind`](TrackKind.md)
