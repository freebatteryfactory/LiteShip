/**
 * Local brand types for `@czap/canonical`.
 *
 * Kept self-contained (no `@czap/_spine`) so the bytes kernel carries no
 * peer-dependency baggage. `@czap/core` re-anchors to spine types at its
 * export boundary (ADR-0012).
 *
 * @module
 */

/** Content-addressed hash. Format: `fnv1a:XXXXXXXX` (8 hex digits). */
export type ContentAddress = `fnv1a:${string}`;

/** Cryptographic digest brand. Format: `sha256:<64-hex>` or `blake3:<64-hex>`. */
export type IntegrityDigest = `sha256:${string}` | `blake3:${string}`;

/** Wrap a plain string as a {@link ContentAddress}. */
export const ContentAddress = (value: string): ContentAddress => value as ContentAddress;

/** Wrap a plain string as an {@link IntegrityDigest}. */
export const IntegrityDigest = (value: string): IntegrityDigest => value as IntegrityDigest;
