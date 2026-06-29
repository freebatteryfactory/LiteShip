[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [assets/src](../README.md) / walkRiff

# Function: walkRiff()

> **walkRiff**(`buffer`): `Generator`\<[`WavChunk`](../type-aliases/WavChunk.md)\>

Defined in: [assets/src/decoders/riff.ts:62](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/assets/src/decoders/riff.ts#L62)

Iterate over every chunk in a RIFF buffer. The first yielded value is
always the RIFF header; subsequent yields are top-level chunks in the
order they appear. LIST chunks carry their listType so callers can
dispatch (e.g. LIST/INFO for tag metadata).

Throws a `ParseError('riff', …, { code: 'malformed', offset })` when the
buffer is too small, a chunk overruns the buffer, or the magic is not
'RIFF' — `offset` carries the byte position of the failure.

## Parameters

### buffer

`ArrayBuffer`

## Returns

`Generator`\<[`WavChunk`](../type-aliases/WavChunk.md)\>
