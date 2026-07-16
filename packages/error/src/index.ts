/**
 * `@czap/error` — the one LiteShip error algebra.
 *
 * A composable, zero-dependency tagged-error coproduct. Errors are tagged DATA
 * values (no class hierarchy): differentiated by a `_tag` field, assembled by
 * union types, given behaviour by standalone functions, and thrown/failed as
 * real `Error` values (stack traces + `instanceof Error`) via {@link taggedError}.
 *
 * Two faces, one value:
 * - **Effect** packages: `Effect.fail(ValidationError(…))` +
 *   `Effect.catchTag('ValidationError', …)` — `catchTag` keys on `_tag`, so the
 *   plain records here are first-class Effect failures with no `effect` import.
 * - **Plain** packages: `throw ValidationError(…)` + `hasTag(e, 'ValidationError')`
 *   / `matchTag(e, …)` — same value, no `effect` dependency.
 *
 * Each variant name is BOTH the type and the constructor (declaration merging),
 * mirroring the `@czap/core` brand idiom: `ValidationError` is a type in type
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
