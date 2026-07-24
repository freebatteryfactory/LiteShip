/**
 * Local brand types for `@liteship/canonical`.
 *
 * Kept self-contained (no `@liteship/_spine`) so the bytes kernel carries no
 * peer-dependency baggage. `@liteship/core` re-anchors to spine types at its
 * export boundary (ADR-0012).
 *
 * The constructors are VALIDATING smart constructors (parse-don't-validate):
 * each throws `ValidationError` on input that does not match the brand's
 * real runtime shape, so a branded value is a proof of that shape. `@liteship/error`
 * is a zero-dep foundational package, so importing it here introduces no cycle.
 *
 * @module
 */

import { ValidationError } from '@liteship/error';

/** Content-addressed hash. Format: `fnv1a:XXXXXXXX` (8 hex digits). */
export type ContentAddress = `fnv1a:${string}`;

/** Cryptographic digest brand. Format: `sha256:<64-hex>` or `blake3:<64-hex>`. */
export type IntegrityDigest = `sha256:${string}` | `blake3:${string}`;

/**
 * A {@link ContentAddress} is the `fnv1a:` prefix followed by exactly 8 lowercase
 * hex digits — the full width of the FNV-1a 32-bit output ({@link fnv.ts} pads to
 * 8 via `(h >>> 0).toString(16).padStart(8, '0')`).
 */
const CONTENT_ADDRESS_RE = /^fnv1a:[0-9a-f]{8}$/;

/**
 * An {@link IntegrityDigest} is `sha256:` or `blake3:` followed by exactly 64
 * lowercase hex digits — the full width of a 256-bit cryptographic digest
 * (ADR-0011). Only these two algorithms are sanctioned.
 */
const INTEGRITY_DIGEST_RE = /^(?:sha256|blake3):[0-9a-f]{64}$/;

/** Type guard: `s` is a syntactically valid {@link ContentAddress}. */
export const isContentAddress = (s: string): s is ContentAddress => CONTENT_ADDRESS_RE.test(s);

/** Type guard: `s` is a syntactically valid {@link IntegrityDigest}. */
export const isIntegrityDigest = (s: string): s is IntegrityDigest => INTEGRITY_DIGEST_RE.test(s);

/**
 * Parse a plain string into a {@link ContentAddress}.
 * @throws `ValidationError` when `value` is not `fnv1a:` + 8 lowercase hex.
 */
export const ContentAddress = (value: string): ContentAddress => {
  if (!isContentAddress(value)) {
    throw ValidationError('ContentAddress', `expected fnv1a:<8 lowercase hex>, got ${JSON.stringify(value)}`);
  }
  return value;
};

/**
 * Parse a plain string into an {@link IntegrityDigest}.
 * @throws `ValidationError` when `value` is not `sha256:`/`blake3:` + 64 lowercase hex.
 */
export const IntegrityDigest = (value: string): IntegrityDigest => {
  if (!isIntegrityDigest(value)) {
    throw ValidationError(
      'IntegrityDigest',
      `expected (sha256|blake3):<64 lowercase hex>, got ${JSON.stringify(value)}`,
    );
  }
  return value;
};
