/**
 * The one LiteShip tagged result — a value that is EITHER a success carrying an
 * `A` or a failure carrying an `E`, discriminated by a boolean `ok` field.
 *
 * This is the errors-as-values carrier: a function that can fail returns a
 * `Result<A, E>` instead of throwing, so its `E` stays visible in the type and
 * every caller must discriminate before reaching the value. It is the sync twin
 * of the {@link TaggedError} algebra — the error travels as data in the `error`
 * slot rather than through the throw/`Effect.fail` channel.
 *
 * The type is intentionally structural and unbranded: `E` is unconstrained, so a
 * result may carry a {@link import('./variants.js').LiteShipError} variant, a
 * plain string, or any domain value. `audit`, `cli`, `web`, and `core` all
 * consume THIS owner — there is no second result shape.
 *
 * @module
 */

/**
 * The success arm: `ok` is the literal `true` discriminant, `value` the payload.
 */
export interface Ok<A> {
  readonly ok: true;
  readonly value: A;
}

/**
 * The failure arm: `ok` is the literal `false` discriminant, `error` the payload.
 */
export interface Err<E> {
  readonly ok: false;
  readonly error: E;
}

/**
 * A computed value that is either {@link Ok}`<A>` or {@link Err}`<E>`. Narrowing
 * on the `ok` discriminant (or via {@link isOk}/{@link isErr}) collapses the
 * union to exactly one arm — the else branch is the other, so a match is
 * exhaustive by construction.
 */
export type Result<A, E> = Ok<A> | Err<E>;

/** Build a success. Widens to any `Result<A, …>` at the use site. */
export const ok = <A>(value: A): Ok<A> => ({ ok: true, value });

/** Build a failure. Widens to any `Result<…, E>` at the use site. */
export const err = <E>(error: E): Err<E> => ({ ok: false, error });

/** Narrowing guard for the success arm — the else branch is {@link Err}`<E>`. */
export const isOk = <A, E>(result: Result<A, E>): result is Ok<A> => result.ok;

/** Narrowing guard for the failure arm — the else branch is {@link Ok}`<A>`. */
export const isErr = <A, E>(result: Result<A, E>): result is Err<E> => !result.ok;
