/**
 * `liteship/migrate` — the curated facade over `@liteship/compiler/migrate`: the P14
 * migration adapters that lower foreign sources (media/container queries, W3C-DTCG
 * design tokens, a Tailwind `@theme{}` block, `:root{}` custom properties) into
 * ordinary `defineBoundary`/`defineToken`/`defineTheme` definitions, surfacing every
 * lossy/dropped case as a `MigrationDiagnostic`. Curated named re-exports only — no
 * behavior lives here.
 * @module
 */

export type { MigrationResult, MigrationDiagnostic, FromMediaQueriesOptions } from '@liteship/compiler/migrate';
export { makeMigrationDiagnostic, MIGRATE_CODES } from '@liteship/compiler/migrate';

// P14 adapters — the curated surface over `@liteship/compiler/migrate`.
export { fromMediaQueries } from '@liteship/compiler/migrate';
export { fromContainerQueries } from '@liteship/compiler/migrate';
export { fromDesignTokens } from '@liteship/compiler/migrate';
export type { FromDesignTokensOptions } from '@liteship/compiler/migrate';
export { fromTailwindTheme } from '@liteship/compiler/migrate';
export type { FromTailwindThemeOptions } from '@liteship/compiler/migrate';
export { fromCSSCustomProperties } from '@liteship/compiler/migrate';
export type { FromCSSCustomPropertiesOptions } from '@liteship/compiler/migrate';
