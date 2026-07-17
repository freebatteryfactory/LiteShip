/**
 * Codec — a kernel-schema codec builder.
 *
 * Wraps a kernel {@link Schema} into a typed codec with sync `encode` / `decode`
 * methods that return a value-or-tagged-error {@link Result} — never an Effect,
 * never a throw.
 *
 * Kernel schemas carry no encode TRANSFORM: a decoded value and its wire form
 * are the SAME runtime value (brands refine nominally, not structurally). So the
 * codec is a validated IDENTITY transport — `decode` validates untrusted input
 * into the typed value, `encode` validates a domain value into its wire form —
 * and `Codec.make` accepts an identity schema (`Schema<A, A>`). It has zero
 * in-repo consumers, so this is a public-surface retype only.
 *
 * @module
 */

import { err } from '@czap/error';
import type { ParseError, Result } from '@czap/error';
import { decode, parseErrorFromIssues } from './schema/index.js';
import type { Schema } from './schema/index.js';

interface CodecShape<A, I = A> {
  readonly schema: Schema<A, I>;
  encode(value: A): Result<I, ParseError>;
  decode(input: unknown): Result<A, ParseError>;
}

function _make<A>(schema: Schema<A, A>): CodecShape<A, A> {
  const validate = (value: unknown, source: string): Result<A, ParseError> => {
    const result = decode(schema, value);
    return result.ok ? result : err(parseErrorFromIssues(result.error, source));
  };
  return {
    schema,
    encode: (value) => validate(value, 'Codec.encode'),
    decode: (input) => validate(input, 'Codec.decode'),
  };
}

/**
 * Codec — typed sync encode/decode wrapper over a kernel {@link Schema}. Gives a
 * single call site for schema-driven validation so consumers don't reach for the
 * kernel `decode` directly.
 */
export const Codec = {
  /** Wrap an identity kernel schema in the {@link Codec.Shape} facade. */
  make: _make,
};

export declare namespace Codec {
  /** Structural shape of a codec: underlying schema plus sync `encode` / `decode`. */
  export type Shape<A, I = A> = CodecShape<A, I>;
}
