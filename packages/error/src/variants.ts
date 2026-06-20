/**
 * The built-in LiteShip error variants — the core coproduct.
 *
 * Each variant is an `interface` conforming to {@link TaggedError} (a
 * structural contract, not a base class) plus a factory FUNCTION that composes
 * it with {@link taggedError}. {@link LiteShipError} unions them. Downstream
 * projects do not subclass these — they compose: define their own variant
 * with {@link taggedError} and widen the union
 * (`type AppError = LiteShipError | MyError`).
 *
 * The taxonomy is deliberately small and general. A variant carries enough
 * structured fields to preserve what callers branch on (e.g. {@link ParseError}
 * keeps a machine `code` + byte `offset`), so a tighter taxonomy never loses
 * information. When a domain genuinely needs its own discriminant, that is the
 * extension path — not a new catch-all field here.
 *
 * @module
 */

import { taggedError, type TaggedError } from './contract.js';

/**
 * A precondition, argument, or factory-input check failed — the value was
 * structurally fine but semantically rejected (out of range, empty, mutually
 * exclusive options, call-order violation).
 *
 * Migration target for: `CzapValidationError`, `InvalidParamsError`, and the
 * argument/config validation throws across `cli`, `core`, `cloudflare`.
 */
export interface ValidationError extends TaggedError<'ValidationError'> {
  /** The unit that rejected the input, e.g. `'Boundary.make'`. */
  readonly module: string;
  /** What was wrong, in human terms. */
  readonly detail: string;
}

/** Build a {@link ValidationError}. */
export const ValidationError = (module: string, detail: string): ValidationError =>
  taggedError('ValidationError', `${module}: ${detail}`, { module, detail });

/**
 * Decoding external bytes or text into a typed shape failed. The input came
 * from outside the program (a file, a wire payload, a config), and it did not
 * conform.
 *
 * Migration target for: `CborDecodeError` (`code` = the reason discriminant,
 * `offset` = the byte position), JSON/manifest/profile parse throws across
 * `cli`, `edge`, `audit`, `command`.
 */
export interface ParseError extends TaggedError<'ParseError'> {
  /** What was being parsed, e.g. `'cbor'`, `'profile.json'`. */
  readonly source: string;
  /** Why it failed, in human terms. */
  readonly detail: string;
  /** Optional machine-readable reason, for callers that branch on it. */
  readonly code?: string;
  /** Optional byte/char offset where parsing failed. */
  readonly offset?: number;
}

/** Build a {@link ParseError}. `opts` carries the optional machine fields. */
export const ParseError = (
  source: string,
  detail: string,
  opts: { readonly code?: string; readonly offset?: number } = {},
): ParseError =>
  taggedError(
    'ParseError',
    opts.offset !== undefined ? `${source}@${opts.offset}: ${detail}` : `${source}: ${detail}`,
    {
      source,
      detail,
      ...(opts.code !== undefined ? { code: opts.code } : {}),
      ...(opts.offset !== undefined ? { offset: opts.offset } : {}),
    },
  );

/**
 * A file, process, or network operation failed at runtime. The operation was
 * well-formed; the environment refused or errored.
 *
 * Migration target for: asset file read/write, `ffmpeg` spawn/encode, and the
 * IO throws across `assets`, `stage`, `command`, `cli`.
 */
export interface IoError extends TaggedError<'IoError'> {
  /** The operation that failed, e.g. `'readFile'`, `'ffmpeg.encode'`. */
  readonly operation: string;
  /** What went wrong, in human terms. */
  readonly detail: string;
  /** Optional path/URI the operation targeted. */
  readonly path?: string;
}

/**
 * Build an {@link IoError}. `opts.path` is the target; `opts.cause` chains the
 * underlying OS/library error through the standard `Error.cause` slot (read it
 * at `error.cause`, not as a own field).
 */
export const IoError = (
  operation: string,
  detail: string,
  opts: { readonly path?: string; readonly cause?: unknown } = {},
): IoError =>
  taggedError(
    'IoError',
    opts.path !== undefined ? `${operation} (${opts.path}): ${detail}` : `${operation}: ${detail}`,
    {
      operation,
      detail,
      ...(opts.path !== undefined ? { path: opts.path } : {}),
    },
    opts.cause !== undefined ? { cause: opts.cause } : undefined,
  );

/**
 * A required runtime capability is absent in the current environment — the
 * code is correct but the host cannot run it (no WebCodecs, no OffscreenCanvas,
 * no attached canvas yet).
 *
 * Migration target for: the host-capability/precondition throws across `web`,
 * `worker`, `edge`.
 */
export interface HostCapabilityError extends TaggedError<'HostCapabilityError'> {
  /** The missing capability, e.g. `'WebCodecs.VideoEncoder'`. */
  readonly capability: string;
  /** Context + remediation, in human terms. */
  readonly detail: string;
}

/** Build a {@link HostCapabilityError}. */
export const HostCapabilityError = (capability: string, detail: string): HostCapabilityError =>
  taggedError('HostCapabilityError', `${capability} unavailable: ${detail}`, { capability, detail });

/**
 * An internal invariant was violated — a state the program's own logic should
 * make impossible (counter overflow, ring-buffer state machine breach,
 * assembly-contract violation, DAG cycle). Distinct from {@link ValidationError}:
 * the bad value did NOT come from a caller, it came from us.
 *
 * Migration target for: the state-machine/contract throws across `worker`,
 * `core` (`assembly`, `hlc`, `plan`), `scene`.
 */
export interface InvariantViolationError extends TaggedError<'InvariantViolationError'> {
  /** The invariant that broke, e.g. `'spsc-ring.capacity'`. */
  readonly invariant: string;
  /** What was observed, in human terms. */
  readonly detail: string;
}

/** Build an {@link InvariantViolationError}. */
export const InvariantViolationError = (invariant: string, detail: string): InvariantViolationError =>
  taggedError('InvariantViolationError', `invariant ${invariant} violated: ${detail}`, { invariant, detail });

/**
 * A referenced resource or identifier was not found.
 *
 * Migration target for: `ResourceNotFoundError`, `--profile path not found`,
 * `tarball has no package/package.json entry`, and the lookup-miss throws
 * across `cli`, `mcp-server`, `edge`.
 */
export interface NotFoundError extends TaggedError<'NotFoundError'> {
  /** The kind of thing sought, e.g. `'profile'`, `'resource'`. */
  readonly kind: string;
  /** The identifier that missed, e.g. a path or URI. */
  readonly id: string;
  /** Optional extra context. */
  readonly detail?: string;
}

/** Build a {@link NotFoundError}. */
export const NotFoundError = (kind: string, id: string, detail?: string): NotFoundError =>
  taggedError(
    'NotFoundError',
    detail !== undefined ? `${kind} not found: ${id} (${detail})` : `${kind} not found: ${id}`,
    {
      kind,
      id,
      ...(detail !== undefined ? { detail } : {}),
    },
  );

/**
 * A value or case fell outside the supported set — a known-but-unhandled
 * platform, an AST node with no mapping, a reserved encoding.
 *
 * Migration target for: `UnsupportedSchemaError`, `unsupported platform`, and
 * the "outside the modelled set" throws across `core` (`harness`), `command`.
 */
export interface UnsupportedError extends TaggedError<'UnsupportedError'> {
  /** What was unsupported, e.g. `'schema node'`, `'platform'`. */
  readonly subject: string;
  /** The unsupported value + what IS supported, in human terms. */
  readonly detail: string;
}

/** Build an {@link UnsupportedError}. */
export const UnsupportedError = (subject: string, detail: string): UnsupportedError =>
  taggedError('UnsupportedError', `unsupported ${subject}: ${detail}`, { subject, detail });

/**
 * Verification of content-addressed, ordered, or signed data failed — the
 * bytes decoded FINE, but they do not match their claimed identity, link,
 * order, or signature. The L4 "downstream would trust bad reality" category:
 * corruption, tampering, or version skew, NOT a malformed input.
 *
 * Distinct from {@link ParseError} (couldn't read the bytes) and from
 * {@link InvariantViolationError} (our own impossible state): here the data is
 * well-formed and external, and its integrity claim is false.
 *
 * Migration target for: `ChainValidationError` (`code` = `hash_mismatch` /
 * `chain_break` / `hlc_not_increasing` / `not_genesis`), signature
 * verification, and content-address/digest mismatch across `core`, `canonical`.
 */
export interface IntegrityError extends TaggedError<'IntegrityError'> {
  /** What was being verified, e.g. `'receipt-chain'`, `'content-address'`, `'signature'`. */
  readonly subject: string;
  /** What failed verification, in human terms. */
  readonly detail: string;
  /** Optional machine reason, e.g. `'hash_mismatch'`, for callers that branch on it. */
  readonly code?: string;
  /** Optional claimed/expected value (e.g. the stored hash). */
  readonly expected?: string;
  /** Optional observed/computed value (e.g. the recomputed hash). */
  readonly actual?: string;
}

/** Build an {@link IntegrityError}. `opts` carries the optional reason + expected/actual. */
export const IntegrityError = (
  subject: string,
  detail: string,
  opts: { readonly code?: string; readonly expected?: string; readonly actual?: string } = {},
): IntegrityError =>
  taggedError('IntegrityError', `integrity check failed for ${subject}: ${detail}`, {
    subject,
    detail,
    ...(opts.code !== undefined ? { code: opts.code } : {}),
    ...(opts.expected !== undefined ? { expected: opts.expected } : {}),
    ...(opts.actual !== undefined ? { actual: opts.actual } : {}),
  });

/**
 * The core LiteShip error coproduct — the union of the built-in variants.
 *
 * This is the algebra's CLOSED set. Downstream projects extend by composing,
 * not editing: `type AppError = LiteShipError | MyDomainError`. Every helper
 * in {@link module:contract} operates on the open {@link TaggedError} contract,
 * so a widened union keeps full `matchTag`/`hasTag`/`raise` support.
 */
export type LiteShipError =
  | ValidationError
  | ParseError
  | IoError
  | HostCapabilityError
  | InvariantViolationError
  | NotFoundError
  | UnsupportedError
  | IntegrityError;

/** The literal `_tag` of every built-in variant — handy for tests and registries. */
export const LITESHIP_ERROR_TAGS = [
  'ValidationError',
  'ParseError',
  'IoError',
  'HostCapabilityError',
  'InvariantViolationError',
  'NotFoundError',
  'UnsupportedError',
  'IntegrityError',
] as const;

/** The `_tag` union of the built-in variants. */
export type LiteShipErrorTag = (typeof LITESHIP_ERROR_TAGS)[number];

/**
 * Exhaustiveness guard for `switch` statements over a closed union — the
 * statement-level twin of {@link matchTag}. Put it in the `default:` branch:
 * if every case is handled, the scrutinee is `never` and this compiles; add a
 * variant without a matching case and it becomes a COMPILE error. The one
 * shared replacement for the hand-rolled `const _x: never = value` idiom.
 *
 * At runtime — reached only when a value outside the static type slips in (bad
 * external data the types claimed impossible) — it throws an
 * {@link InvariantViolationError}, since reaching it means a contract the type
 * system guaranteed was broken.
 *
 * @example
 * ```ts
 * switch (node._tag) {
 *   case 'A': return handleA(node);
 *   case 'B': return handleB(node);
 *   default: return assertNever(node, 'node._tag');
 * }
 * ```
 */
export function assertNever(value: never, context = 'exhaustiveness'): never {
  throw InvariantViolationError(context, `unhandled variant: ${String(value)}`);
}
