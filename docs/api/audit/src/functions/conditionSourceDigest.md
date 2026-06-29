[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / conditionSourceDigest

# Function: conditionSourceDigest()

> **conditionSourceDigest**(`file`, `text`): `string`

Defined in: [audit/src/mcdc-engine.ts:370](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mcdc-engine.ts#L370)

A deterministic display digest of a source file (its id + bytes) — exported so the
host can fingerprint a seam's bytes for the MC/DC facts without re-deriving the
content-addressing. Pure; routes through the same `addressedDigestOf` kernel.

## Parameters

### file

`string`

### text

`string`

## Returns

`string`
