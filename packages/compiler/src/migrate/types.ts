/**
 * `@liteship/compiler/migrate` — TYPE-ONLY contract for the P14 migration adapters.
 *
 * Every `fromX(input, options?)` adapter lowers a foreign source (media/container
 * queries, W3C-DTCG tokens, a Tailwind `@theme{}` block, `:root{}` custom
 * properties) into ordinary `defineBoundary` / `defineToken` / `defineTheme`
 * definitions, accumulating a lightweight {@link MigrationDiagnostic} record for
 * every lossy/dropped/ambiguous case rather than throwing. This module declares
 * ONLY types — no runtime — so it stays purity-clean under `types-file-purity`.
 *
 * @module
 */

import type { DiagnosticCodeFor } from '@liteship/error';
import type { Boundary, Token, Theme } from '@liteship/core';

/**
 * One migration diagnostic — the lightweight record the adapters accumulate.
 *
 * Deliberately NOT the gauntlet `Finding` (which carries assurance-level /
 * coverage-class semantics and would force a `@liteship/gauntlet` dep onto the
 * compiler). Compiler deps stay `@liteship/core` + `@liteship/error` only.
 */
export interface MigrationDiagnostic {
  /** A `migrate/…` code enrolled in the `@liteship/error` DIAGNOSTIC_REGISTRY. */
  readonly code: DiagnosticCodeFor<'migrate'>;
  /** Human/agent-readable summary of what happened at this source location. */
  readonly message: string;
  /** Source location — a selector chain, token path, or feature name. */
  readonly path?: readonly (string | number)[];
  /** `warning` = lossy-but-usable; `error` = the source could not be represented and was dropped. */
  readonly severity: 'warning' | 'error';
  /** The originating error/value, when the diagnostic wraps a caught throw or decode issue. */
  readonly cause?: unknown;
}

/**
 * The result of a migration adapter — the produced definitions plus every
 * diagnostic emitted while producing them. The definition arrays are the real
 * `@liteship/core` runtime handles (`defineBoundary`/`defineToken`/`defineTheme`
 * outputs), already validated by their constructors.
 */
export interface MigrationResult {
  readonly boundaries: readonly Boundary[];
  readonly tokens: readonly Token[];
  readonly themes: readonly Theme[];
  readonly diagnostics: readonly MigrationDiagnostic[];
}

/** Units preserved by query migration; relative values are never guessed as pixels. */
export type QueryLengthUnit = 'px' | 'em' | 'rem' | 'zero';

/** A viewport dimension the migration host may expose in an authored relative unit. */
export interface MediaLengthInputRequest {
  readonly axis: 'width' | 'height';
  readonly unit: 'em' | 'rem';
}

/**
 * Shared shape for the media/container-query adapters: the `state:` name prefix
 * used when synthesizing boundary state names from parsed thresholds. Adapters
 * may extend this with their own options; keep this minimal.
 */
export interface FromMediaQueriesOptions {
  /** Prefix for synthesized boundary state names (e.g. `'bp'` → `bp-0`, `bp-768`). */
  readonly statePrefix?: string;
  /**
   * Resolve a relative media-query length onto a host signal measured in that
   * exact authored unit. Pixel and unitless-zero queries keep the built-in
   * viewport input and do not call this hook.
   */
  readonly resolveLengthInput?: (request: MediaLengthInputRequest) => string | undefined;
}

/** One source container dimension that a migration host must bind to a LiteShip input. */
export interface ContainerInputRequest {
  /** The authored container name, or `undefined` for the nearest anonymous query container. */
  readonly name?: string;
  /** The queried physical/logical axis after normalization. */
  readonly axis: 'width' | 'height';
  /** The authored threshold unit; `zero` is unitless zero. */
  readonly unit: QueryLengthUnit;
}

/** Options for {@link fromContainerQueries}. */
export interface FromContainerQueriesOptions extends FromMediaQueriesOptions {
  /**
   * Resolve source container identity onto an explicitly host-owned LiteShip input.
   * Return `undefined` when the host cannot preserve that identity. The adapter never
   * substitutes a viewport input: container size and viewport size are different facts.
   */
  readonly resolveInput?: (request: ContainerInputRequest) => string | undefined;
}
