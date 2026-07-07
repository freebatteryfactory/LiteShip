[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / buildActiveSurfaceFacts

# Function: buildActiveSurfaceFacts()

> **buildActiveSurfaceFacts**(`opts`): `ActiveSurfaceFacts`

Defined in: [audit/src/active-surface-reader.ts:163](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/active-surface-reader.ts#L163)

Build `ActiveSurfaceFacts` — the HOST's job for #132. Pure given the source on
disk: a deterministic `ts.Program` over the reader paths yields the same field-read
verdict every run.

## Parameters

### opts

[`ActiveSurfaceReaderOptions`](../interfaces/ActiveSurfaceReaderOptions.md)

## Returns

`ActiveSurfaceFacts`
