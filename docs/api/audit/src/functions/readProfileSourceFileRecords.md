[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / readProfileSourceFileRecords

# Function: readProfileSourceFileRecords()

> **readProfileSourceFileRecords**(`profile`): readonly [`SourceFileRecord`](../interfaces/SourceFileRecord.md)[]

Defined in: [audit/src/shared.ts:159](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/shared.ts#L159)

Profile-aware source walking. With `profile.packageRoots`, glob each
package's `src/` individually — the global `auditSourceGlobs` assume a
`packages/*` layout and `auditIgnoreGlobs` exclude `node_modules`, which
is exactly where consumer-installed packages live.

## Parameters

### profile

[`DevopsProfile`](../interfaces/DevopsProfile.md)

## Returns

readonly [`SourceFileRecord`](../interfaces/SourceFileRecord.md)[]
