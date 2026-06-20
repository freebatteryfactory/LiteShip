/**
 * Re-export canonical bytes kernel from `@czap/canonical`.
 *
 * `CanonicalCbor` is the deterministic (RFC 8949 §4.2.1) encoder; `decode`
 * is its strict inverse over the same canonical subset, raising a `@czap/error`
 * `ParseError` (source `'cbor'`) for non-canonical input.
 * @module
 */
export { CanonicalCbor, decode } from '@czap/canonical';
