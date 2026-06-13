/**
 * Re-export canonical bytes kernel from `@czap/canonical`.
 *
 * `CanonicalCbor` is the deterministic (RFC 8949 §4.2.1) encoder; `decode`
 * is its strict inverse over the same canonical subset, and `CborDecodeError`
 * is the typed rejection it raises for non-canonical input.
 * @module
 */
export { CanonicalCbor, decode, CborDecodeError } from '@czap/canonical';
export type { CborDecodeErrorReason } from '@czap/canonical';
