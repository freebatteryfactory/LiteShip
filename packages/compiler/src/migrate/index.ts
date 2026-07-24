/**
 * `@liteship/compiler/migrate` — the P14 migration adapters domain. Thin lowering
 * of foreign sources (media/container queries, W3C-DTCG tokens, Tailwind `@theme{}`,
 * `:root{}` custom properties) into ordinary `defineBoundary`/`defineToken`/
 * `defineTheme` definitions, with lossy/dropped cases surfaced as
 * {@link MigrationDiagnostic}s. Pure named re-export facade — no declarations.
 *
 * @module
 */

export type {
  MigrationResult,
  MigrationDiagnostic,
  FromMediaQueriesOptions,
  FromContainerQueriesOptions,
  ContainerInputRequest,
  MediaLengthInputRequest,
  QueryLengthUnit,
} from './types.js';
export { makeMigrationDiagnostic, MIGRATE_CODES } from './diagnostics.js';

// P14 adapters — thin lowering over the core primitives, one `fromX` per source.
export { fromMediaQueries } from './from-media-queries.js';
export { fromContainerQueries } from './from-container-queries.js';
export { fromDesignTokens, DTCG_FORMAT_VERSION } from './from-design-tokens.js';
export type { FromDesignTokensOptions } from './from-design-tokens.js';
export { fromTailwindTheme } from './from-tailwind-theme.js';
export type { FromTailwindThemeOptions } from './from-tailwind-theme.js';
export { fromCSSCustomProperties } from './from-css-custom-properties.js';
export type { FromCSSCustomPropertiesOptions } from './from-css-custom-properties.js';
