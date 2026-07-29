[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [audit/src](../README.md) / resolveImport

# Function: resolveImport()

> **resolveImport**(`specifier`, `containingFile`, `packageExportTargets`, `internalPrefix`): [`ResolvedImport`](../interfaces/ResolvedImport.md)

Defined in: [audit/src/structure.ts:227](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/structure.ts#L227)

Resolve one source import through the injected alias and package policy.

## Parameters

### specifier

`string`

### containingFile

`string`

### packageExportTargets

[`Map`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map)\<`string`, [`PackageExportTarget`](../interfaces/PackageExportTarget.md)\>

### internalPrefix

`string`

## Returns

[`ResolvedImport`](../interfaces/ResolvedImport.md)
