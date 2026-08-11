/**
 * Error and diagnostic contracts for LiteShip core.
 *
 * Expected failure is typed data. A thrown platform Error is reserved for
 * invalid authored definitions, violated invariants, or unexpected host defects.
 * Rich rendering is a projection over one stable structured diagnostic.
 *
 * @module
 */

import type { Algebra, Brand, DataPath, Result, Tagged } from '../../types.js';

/** Stable, namespace-qualified diagnostic identity. */
export type DiagnosticCode = Brand<string, 'liteship.diagnostic-code'>;

/** Stable source-home identity used by diagnostics and authority discovery. */
export type DiagnosticOwner = Brand<string, 'liteship.diagnostic-owner'>;

/** Severity controls policy, not message wording. */
export type DiagnosticSeverity = 'error' | 'warning' | 'info';

/** Optional source location for authored or generated material. */
export interface SourceLocation {
  readonly file?: string;
  readonly line?: number;
  readonly column?: number;
  readonly path?: DataPath;
}

/** Subject a diagnostic is about. */
export type DiagnosticSubject = Algebra<{
  path: { readonly path: DataPath };
  symbol: { readonly name: string };
  entity: { readonly id: string };
  revision: { readonly id: string };
  operation: { readonly id: string };
  artifact: { readonly id: string };
  source: { readonly id: string };
}>;

/** Machine-actionable remediation using established engineering verbs. */
export type RemediationAction = Algebra<{
  edit: { readonly path?: DataPath; readonly replacement?: string; readonly explanation: string };
  run: { readonly command: readonly string[]; readonly explanation: string };
  choose: { readonly options: readonly string[]; readonly explanation: string };
  supply: { readonly requirement: string; readonly explanation: string };
  inspect: { readonly target: string; readonly explanation: string };
  retry: { readonly condition: string; readonly explanation: string };
  'contact-owner': { readonly owner: string; readonly explanation: string };
}>;

/** One structured diagnostic shared by humans, agents, wires, and assurance. */
export interface Diagnostic<Detail = unknown> {
  readonly code: DiagnosticCode;
  readonly severity: DiagnosticSeverity;
  readonly summary: string;
  readonly detail?: Detail;
  readonly owner: DiagnosticOwner;
  readonly subject?: DiagnosticSubject;
  readonly location?: SourceLocation;
  readonly cause?: unknown;
  readonly evidence?: readonly unknown[];
  readonly remediation: readonly RemediationAction[];
}

/** Compact, detailed, and lossless machine rendering modes. */
export type DiagnosticRenderMode = 'compact' | 'detailed' | 'machine';

/** Platform Error carrying a stable tagged data contract. */
export type StructuredError<Tag extends string, Fields extends object = {}> = Error &
  Tagged<Tag, { readonly code: DiagnosticCode; readonly diagnostic: Diagnostic } & Fields>;

/** Invalid immutable authored intent. Raised synchronously by ergonomic define APIs. */
export type DefinitionError = StructuredError<'DefinitionError', { readonly definition: string }>;

/** A state that should be impossible if upstream contracts were honored. */
export type InvariantError = StructuredError<'InvariantError', { readonly invariant: string }>;

/** Unexpected physical host failure preserved as a cause and projected at boundaries. */
export type HostError = StructuredError<'HostError', { readonly host: string; readonly operation: string }>;

/** Result returned by validators and boundary decoders. */
export type ValidationResult<Value> = Result<Value, readonly Diagnostic[]>;

/** Type summary consumed by the root core topology. */
export interface ErrorTypeSurface {
  readonly diagnostic: Diagnostic;
  readonly definitionError: DefinitionError;
  readonly invariantError: InvariantError;
  readonly hostError: HostError;
  readonly remediation: RemediationAction;
  readonly validation: ValidationResult<unknown>;
}
