[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / liteship/src/migrate

# liteship/src/migrate

`liteship/migrate` — the curated facade over `@liteship/compiler/migrate`: the P14
migration adapters that lower foreign sources (media/container queries, W3C-DTCG
design tokens, a Tailwind `@theme{}` block, `:root{}` custom properties) into
ordinary `defineBoundary`/`defineToken`/`defineTheme` definitions, surfacing every
lossy/dropped case as a `MigrationDiagnostic`. Curated named re-exports only — no
behavior lives here.

## Interfaces

- [FromCSSCustomPropertiesOptions](interfaces/FromCSSCustomPropertiesOptions.md)
- [FromDesignTokensOptions](interfaces/FromDesignTokensOptions.md)
- [FromMediaQueriesOptions](interfaces/FromMediaQueriesOptions.md)
- [FromTailwindThemeOptions](interfaces/FromTailwindThemeOptions.md)
- [MigrationDiagnostic](interfaces/MigrationDiagnostic.md)
- [MigrationResult](interfaces/MigrationResult.md)

## Variables

- [DTCG\_FORMAT\_VERSION](variables/DTCG_FORMAT_VERSION.md)
- [MIGRATE\_CODES](variables/MIGRATE_CODES.md)

## Functions

- [fromContainerQueries](functions/fromContainerQueries.md)
- [fromCSSCustomProperties](functions/fromCSSCustomProperties.md)
- [fromDesignTokens](functions/fromDesignTokens.md)
- [fromMediaQueries](functions/fromMediaQueries.md)
- [fromTailwindTheme](functions/fromTailwindTheme.md)
- [makeMigrationDiagnostic](functions/makeMigrationDiagnostic.md)
