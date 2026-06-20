/**
 * The composition substrate for the LiteShip error algebra.
 *
 * An error here is a TAGGED DATA VALUE, never a place in a class hierarchy.
 * There are no per-variant `class … extends …` declarations: variants are
 * distinguished by a `_tag` field, assembled by union types, and given
 * behaviour by the standalone functions in this module. The one platform
 * `new Error()` used by {@link taggedError} is a transport we compose data
 * *onto* (for stack traces + ecosystem `instanceof Error`), not a base to
 * inherit from.
 *
 * This is the whole extensibility story: a downstream project conforms a
 * record to {@link TaggedError}, builds it with {@link taggedError}, composes
 * it into its own union, and every helper here (`hasTag`, `matchTag`,
 * `matchTagOr`, `raise`) works on it unchanged — no rebuild, no fork.
 *
 * @module
 */

/**
 * The open structural contract every error in the algebra satisfies.
 *
 * This is a CONTRACT (a shape: "has these fields"), not a base class. Both
 * LiteShip's built-in variants and any downstream variant are plain readonly
 * records carrying a string discriminant (`_tag`) and a human `message`.
 */
export interface TaggedError<Tag extends string = string> {
  /** The discriminant. Unique per variant; what `matchTag`/`hasTag` key on. */
  readonly _tag: Tag;
  /** Human-readable summary. Doubles as the transport `Error.message`. */
  readonly message: string;
}

/**
 * A {@link TaggedError} value that is also a platform `Error` — what every
 * factory built on {@link taggedError} returns. Carries a real stack trace
 * and answers `instanceof Error`, while remaining a tagged data record.
 */
export type TaggedErrorValue<Tag extends string, Fields extends object> = Error & TaggedError<Tag> & Readonly<Fields>;

/**
 * The one composer. Builds a tagged error by composing `_tag` + structured
 * `fields` onto a fresh platform `Error` (so the result has a stack trace and
 * is `instanceof Error`) — without ever subclassing `Error`.
 *
 * Pass `options.cause` to chain an underlying error through the platform-
 * standard `Error.cause` — so wrapping a caught OS/library error preserves it
 * (`error.cause`) on any variant, without each variant declaring a field.
 *
 * @example
 * ```ts
 * interface ParseError extends TaggedError<'ParseError'> {
 *   readonly source: string;
 *   readonly detail: string;
 * }
 * const ParseError = (source: string, detail: string): ParseError =>
 *   taggedError('ParseError', `${source}: ${detail}`, { source, detail });
 *
 * // chaining a lower-level failure:
 * try { readFileSync(p); } catch (cause) {
 *   throw taggedError('IoError', `read ${p}`, { operation: 'readFile' }, { cause });
 * }
 * ```
 */
export function taggedError<const Tag extends string, Fields extends object>(
  tag: Tag,
  message: string,
  fields: Fields,
  options?: { readonly cause?: unknown },
): TaggedErrorValue<Tag, Fields> {
  // Native `Error.cause` (ES2022) is the standard chaining slot — only set it
  // when a cause is supplied so unchained errors stay `cause`-free.
  const error =
    options !== undefined && options.cause !== undefined
      ? new Error(message, { cause: options.cause })
      : new Error(message);
  // Compose structured fields first, then stamp the identity LAST so a field
  // can never spoof the discriminant or message (a `fields._tag` is ignored).
  // `name` drives the default `toString()`/console rendering, so a thrown
  // tagged error prints as `ParseError: …` rather than the generic `Error: …`.
  return Object.assign(error, fields, {
    _tag: tag,
    name: tag,
    message,
  }) as TaggedErrorValue<Tag, Fields>;
}

/**
 * Structural guard: is `u` any value conforming to {@link TaggedError}?
 * Works across realms and on plain records (not just `Error` instances),
 * because it checks the shape, not the prototype.
 */
export function isTaggedError(u: unknown): u is TaggedError {
  return (
    typeof u === 'object' &&
    u !== null &&
    typeof (u as { _tag?: unknown })._tag === 'string' &&
    typeof (u as { message?: unknown }).message === 'string'
  );
}

/**
 * Narrowing guard for a specific tag — the data-oriented replacement for
 * `instanceof SomeError`. `hasTag(e, 'ParseError')` narrows `e` to the
 * `ParseError` variant.
 */
export function hasTag<Tag extends string>(u: unknown, tag: Tag): u is TaggedError<Tag> {
  return isTaggedError(u) && u._tag === tag;
}

/** The discriminant of `u` if it is a tagged error, else `undefined`. */
export function getTag(u: unknown): string | undefined {
  return isTaggedError(u) ? u._tag : undefined;
}

/**
 * Throw a tagged error as a value, typed `never` so it composes inside
 * expressions (`return cond ? value : raise(SomeError(…))`). Errors built by
 * {@link taggedError} are real `Error`s, so the throw carries a stack trace.
 */
export function raise(error: TaggedError): never {
  throw error;
}

/**
 * Exhaustive match over a closed error union. The `handlers` object MUST
 * supply a branch for every `_tag` in `E` — omit one and it is a compile
 * error. This is the errors-as-values analogue of an `assertNever` switch:
 * adding a variant to the union forces every match site to handle it.
 *
 * @example
 * ```ts
 * const text = matchTag(err, {
 *   ParseError: (e) => `bad input from ${e.source}`,
 *   IoError: (e) => `io failed: ${e.operation}`,
 * });
 * ```
 */
export function matchTag<E extends TaggedError, R>(
  error: E,
  handlers: { readonly [K in E['_tag']]: (error: Extract<E, TaggedError<K>>) => R },
): R {
  const handler = handlers[error._tag as E['_tag']];
  return handler(error as Extract<E, TaggedError<E['_tag']>>);
}

/**
 * Partial match with a fallback — the OPEN counterpart to {@link matchTag}.
 * Handle the tags you care about; `orElse` covers the rest. This is the
 * extension-friendly matcher: a consumer matches LiteShip's known variants
 * and routes everything else (including their own) through `orElse`.
 */
export function matchTagOr<E extends TaggedError, R>(
  error: E,
  handlers: Partial<{ readonly [K in E['_tag']]: (error: Extract<E, TaggedError<K>>) => R }>,
  orElse: (error: E) => R,
): R {
  const handler = handlers[error._tag as E['_tag']] as ((error: E) => R) | undefined;
  return handler ? handler(error) : orElse(error);
}
