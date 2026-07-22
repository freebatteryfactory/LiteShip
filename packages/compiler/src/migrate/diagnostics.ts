/**
 * `migrate/diagnostics` — the in-domain source of the pinned `migrate/*` diagnostic
 * code strings and the {@link makeMigrationDiagnostic} builder every adapter uses to
 * emit a {@link MigrationDiagnostic}. The eight codes here are the SINGLE in-domain
 * mirror of the entries enrolled in the `@liteship/error` DIAGNOSTIC_REGISTRY —
 * adapters draw codes ONLY from {@link MIGRATE_CODES} (adding a new code means also
 * enrolling it in the registry).
 *
 * @module
 */

import type { DiagnosticCodeFor } from '@liteship/error';
import type { MigrationDiagnostic } from './types.js';

/**
 * The eight pinned `migrate/*` diagnostic codes, frozen. Each is a typed
 * {@link DiagnosticCode} literal and is enrolled (verbatim) in the
 * `@liteship/error` DIAGNOSTIC_REGISTRY under the `migrate` area.
 */
export const MIGRATE_CODES = Object.freeze({
  /** A media/container feature has no signal-input lowering; kept as `media:` or dropped. */
  unmappableMediaFeature: 'migrate/unmappable-media-feature',
  /** Parsed thresholds were not strictly ascending; sorted/deduped before `defineBoundary`. */
  nonAscendingThresholds: 'migrate/non-ascending-thresholds',
  /** Overlapping/duplicate breakpoints collapsed. */
  ambiguousBreakpoint: 'migrate/ambiguous-breakpoint',
  /** An at-rule / nested condition is not representable as a boundary. */
  unsupportedAtRule: 'migrate/unsupported-at-rule',
  /** A token value (alias/ref/calc) could not be represented losslessly. */
  lossyTokenConversion: 'migrate/lossy-token-conversion',
  /** A value's CSS syntax could not be classified into a `TokenCategory`. */
  unknownTokenCategory: 'migrate/unknown-token-category',
  /** A token is missing a value for some mode/variant (`defineTheme` completeness). */
  incompleteThemeVariant: 'migrate/incomplete-theme-variant',
  /** Input JSON/CSS failed schema decode; folds `DecodeIssue[]` → `ParseError` when fatal. */
  malformedInput: 'migrate/malformed-input',
} as const satisfies Readonly<Record<string, DiagnosticCodeFor<'migrate'>>>);

/** Options for {@link makeMigrationDiagnostic} — everything on the record except `code` and `message`. */
export interface MakeMigrationDiagnosticOptions {
  /** Source location — a selector chain, token path, or feature name. */
  readonly path?: readonly (string | number)[];
  /** `warning` = lossy-but-usable; `error` = dropped. Defaults to `'warning'`. */
  readonly severity?: 'warning' | 'error';
  /** The originating error/value, when wrapping a caught throw or decode issue. */
  readonly cause?: unknown;
}

/**
 * Build one {@link MigrationDiagnostic}. `severity` defaults to `'warning'` (the
 * lossy-but-usable case); pass `'error'` when the source was dropped. Only sets
 * `path`/`cause` when provided, so the record stays minimal.
 */
export function makeMigrationDiagnostic(
  code: DiagnosticCodeFor<'migrate'>,
  message: string,
  opts?: MakeMigrationDiagnosticOptions,
): MigrationDiagnostic {
  return {
    code,
    message,
    severity: opts?.severity ?? 'warning',
    ...(opts?.path !== undefined ? { path: opts.path } : {}),
    ...(opts?.cause !== undefined ? { cause: opts.cause } : {}),
  };
}
