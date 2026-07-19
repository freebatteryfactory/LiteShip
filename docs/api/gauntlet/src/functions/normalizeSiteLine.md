[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / normalizeSiteLine

# Function: normalizeSiteLine()

> **normalizeSiteLine**(`line`): `string`

Defined in: [gauntlet/src/gates/skip-allowlist.ts:113](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/skip-allowlist.ts#L113)

NORMALIZE a source line into the stable SITE discriminator: collapse every run of
whitespace to a single space, then trim. Pure, dependency-free (the lean engine never
imports `@liteship/core`). The same normalization is applied to BOTH the enumerated `site`
values below AND the live skip line at scan time, so the comparison is exact and
indentation/reflow-tolerant while preserving the surviving code tokens (the guard
expression, the runner verb) that identify the site.

## Parameters

### line

`string`

## Returns

`string`
