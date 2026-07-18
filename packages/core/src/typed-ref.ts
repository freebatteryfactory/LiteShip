/**
 * TypedRef -- payload references hashed for the receipt/mutation chain.
 *
 * THE RECEIPT BYTE LAW. `canonicalize` here encodes via `cborg` (deterministic,
 * smallest-float canonical CBOR) and `hash` digests those bytes with SHA-256
 * (`crypto.subtle`) into a `sha256:<hex>` content hash. Every consumer feeds
 * canonicalize → SHA-256: TypedRef.create, Receipt.hashEnvelope/createEnvelope,
 * LiveCell.make/makeBoundary.
 *
 * This is DELIBERATELY NOT the `fnv1a:` identity byte law. Internal `fnv1a:`
 * content addresses are minted only through `CanonicalCbor` (ADR-0003,
 * always-float64, cross-payload agreement; CUT B1). The two byte laws are
 * distinct on purpose:
 *
 *   - IDENTITY  (`fnv1a:`):  CanonicalCbor, always-float64. Needs cross-payload
 *     agreement — two structurally-equal payloads must mint the same address,
 *     so it normalizes float width.
 *   - RECEIPT   (`sha256:`): TypedRef.canonicalize (cborg). Needs only
 *     intra-chain determinism + permanence. A receipt chain only ever compares
 *     its own cborg→sha256 bytes against its own; it never cross-compares the
 *     two encoders, so cborg's smallest-float form is harmless here. cborg is
 *     retained (not migrated to CanonicalCbor) because migrating would invalidate
 *     persisted sha256 receipts for zero correctness gain — and cborg is needed
 *     for decode regardless (CanonicalCbor is encode-only).
 *
 * See `tests/unit/core/receipt-byte-law.test.ts` for the cage and the pinned,
 * intentional cborg-vs-CanonicalCbor float divergence.
 *
 * @module
 */

import { IntegrityError } from '@czap/error';
import { bytesToHex } from '@czap/canonical';
import { encode } from 'cborg';

interface TypedRefShape {
  readonly schema_hash: string;
  readonly content_hash: string;
}

/**
 * Canonicalize a value to deterministic CBOR bytes via `cborg` — the input to
 * SHA-256 receipt/mutation hashing. NOT the `fnv1a:` identity encoder: identity
 * addresses use `CanonicalCbor` (always-float64). See the module header.
 */
export const canonicalize = (value: unknown): Uint8Array => encode(value);

/**
 * Hash data using SHA-256. Returns "sha256:hex" formatted hash.
 *
 * The `bytes as BufferSource` assertion is the single sanctioned cast in this
 * file. `Uint8Array` is structurally a BufferSource, but TS's DOM lib types
 * `bytes.buffer` as potentially-SharedArrayBuffer, preventing direct assignment.
 * Safe: cborg encodes into fresh ArrayBuffer and TextEncoder.encode returns
 * ArrayBuffer-backed views. No data copy.
 *
 * `crypto.subtle.digest` is the seam's ONE genuinely-async leaf, so `hash` is a
 * plain `async` function returning `Promise<string>`. Hash-primitive failures are
 * unrecoverable in practice (crypto.subtle errors are environment-level, not
 * user-recoverable), so a failure is wrapped and re-thrown as a tagged
 * `IntegrityError` (a real `Error`, so `instanceof Error` still holds) — the
 * rejection every content-addressing consumer awaits.
 */
// DELIBERATE CUT (mission 5.10): only the bare-hex encoding is consolidated onto
// @czap/canonical's `bytesToHex`. The `sha256:`-LABELED digest law below stays
// LOCAL — it is NOT merged into `addressedDigestOf` (@czap/canonical): that path
// digests via @noble/hashes and mints a `sha256:`/`blake3:` `IntegrityDigest` for
// the identity layer, whereas this one digests via `crypto.subtle` and mints the
// RECEIPT byte law's `sha256:<hex>` (see the module header). Same prefix, distinct
// byte laws over distinct primitives — collapsing them would silently change one.
export const hash = async (data: string | Uint8Array): Promise<string> => {
  try {
    const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
    const buffer = await crypto.subtle.digest('SHA-256', bytes as BufferSource);
    const hashHex = bytesToHex(new Uint8Array(buffer));
    return `sha256:${hashHex}`;
  } catch (error) {
    throw IntegrityError(
      'content-address',
      `SHA-256 hash failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};

/** Create a TypedRef from schema hash and payload. */
const _create = async (schemaHash: string, payload: unknown): Promise<TypedRefShape> => {
  const contentHash = await hash(canonicalize(payload));
  return { schema_hash: schemaHash, content_hash: contentHash };
};

/** Compare two TypedRefs for structural equality. */
const _equals = (a: TypedRefShape, b: TypedRefShape): boolean =>
  a.schema_hash === b.schema_hash && a.content_hash === b.content_hash;

/**
 * TypedRef — schema-plus-content-hash pointer used by the receipt pipeline.
 * Lets a receipt reference a payload by its content address without embedding
 * the payload itself, while still binding it to a schema identity.
 */
export const TypedRef = {
  /** Build a {@link TypedRef} from a schema hash and an arbitrary payload. */
  create: _create,
  /** Structural equality over schema + content hashes. */
  equals: _equals,
  /** cborg deterministic-CBOR serialization feeding the SHA-256 content hash (the receipt byte law). */
  canonicalize,
  /** Hash a canonicalized payload to its content address. */
  hash,
};

export declare namespace TypedRef {
  /** Structural shape of a typed reference: schema hash + content hash. */
  export type Shape = TypedRefShape;
}
