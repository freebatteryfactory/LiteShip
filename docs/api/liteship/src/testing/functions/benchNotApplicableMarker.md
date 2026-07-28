[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/testing](../README.md) / benchNotApplicableMarker

# Function: benchNotApplicableMarker()

> **benchNotApplicableMarker**(`reason`): `string`

Defined in: core/dist/evidence/bench-marker.d.ts:20

Build the marker line for a given reason. Collapses whitespace to a single
line so the marker is always exactly one source line (the manifest records
the same collapsed reason — see `scripts/capsule-compile.ts`).

## Parameters

### reason

`string`

## Returns

`string`
