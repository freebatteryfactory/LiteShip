/**
 * `@liteship/error` — the one LiteShip error algebra.
 *
 * A composable, zero-dependency tagged-error coproduct. Errors are tagged DATA
 * values (no class hierarchy): differentiated by a `_tag` field, assembled by
 * union types, given behaviour by standalone functions, and thrown/failed as
 * real `Error` values (stack traces + `instanceof Error`) via {@link taggedError}.
 *
 * Two faces, one value:
 * - **Thrown**: `throw ValidationError(…)` + `hasTag(e, 'ValidationError')` /
 *   `matchTag(e, …)` — a real `Error` on the throw channel, branched by `_tag`.
 * - **Errors-as-values**: return it in a {@link Result} err-arm; the caller
 *   discriminates on `.ok` and reads the failure as data, never a throw.
 *
 * Because each record is just a `_tag`-keyed value, it also drops unchanged into
 * any tag-keyed error channel a downstream project already runs — e.g. Effect's
 * `catchTag` — with no `effect` import here. (LiteShip itself shed Effect in
 * Wave 8; this stays a compatibility property, never a dependency.)
 *
 * Each variant name is BOTH the type and the constructor (declaration merging),
 * mirroring the `@liteship/core` brand idiom: `ValidationError` is a type in type
 * position and a factory in value position.
 *
 * Extensible + global: a downstream project imports this package, composes its
 * own variants with {@link taggedError}, widens the union, and reuses every
 * helper unchanged — zero rebuild, zero fork.
 *
 * @module
 */

export {
  type TaggedError,
  type TaggedErrorValue,
  taggedError,
  isTaggedError,
  hasTag,
  getTag,
  raise,
  matchTag,
  matchTagOr,
} from './contract.js';

// Re-exported WITHOUT the `type` modifier so both the type and the factory
// value cross the barrel — `ValidationError` is usable in type and value
// position alike.
export {
  ValidationError,
  ParseError,
  IoError,
  HostCapabilityError,
  InvariantViolationError,
  NotFoundError,
  UnsupportedError,
  IntegrityError,
  assertNever,
  LITESHIP_ERROR_TAGS,
} from './variants.js';

export type { LiteShipError, LiteShipErrorTag } from './variants.js';

// The canonical tagged-result owner — the sync errors-as-values carrier the rest
// of LiteShip (audit/cli/web/core) consumes. Both the arm types and the
// constructors/guards cross the barrel: `Ok`/`Err`/`Result` in type position,
// `ok`/`err`/`isOk`/`isErr` in value position.
export { ok, err, isOk, isErr } from './result.js';
export type { Result, Ok, Err } from './result.js';

// The DIAGNOSTIC-CODE REGISTRY — the one catalogue of every stable diagnostic code
// LiteShip emits (gauntlet gate ruleIds, P11 `check/<slug>` ids, `@liteship/core`
// runtime diagnostics), each enrolled with a title/explanation/remediation. It lives
// here because a diagnostic code is a FAILURE identity and `@liteship/error` is the
// leaf every other package imports; the gauntlet reads it (gauntlet imports error,
// never the reverse) to prove every emitted code is enrolled.
export { DIAGNOSTIC_AREAS, DIAGNOSTIC_REGISTRY, explainDiagnostic } from './codes.js';
export type { DiagnosticCode, DiagnosticCodeFor, DiagnosticArea, DiagnosticEntry } from './codes.js';
