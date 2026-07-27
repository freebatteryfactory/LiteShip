[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/migrate](../README.md) / makeMigrationDiagnostic

# Function: makeMigrationDiagnostic()

> **makeMigrationDiagnostic**(`code`, `message`, `opts?`): [`MigrationDiagnostic`](../interfaces/MigrationDiagnostic.md)

Defined in: compiler/dist/migrate/diagnostics.d.ts:52

Build one [MigrationDiagnostic](../interfaces/MigrationDiagnostic.md). `severity` defaults to `'warning'` (the
lossy-but-usable case); pass `'error'` when the source was dropped. Only sets
`path`/`cause` when provided, so the record stays minimal.

## Parameters

### code

`DiagnosticCodeFor`\<`"migrate"`\>

### message

`string`

### opts?

`MakeMigrationDiagnosticOptions`

## Returns

[`MigrationDiagnostic`](../interfaces/MigrationDiagnostic.md)
