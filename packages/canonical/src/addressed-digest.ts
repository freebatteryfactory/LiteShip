/**
 * AddressedDigest construction — sync fnv1a display_id + sha256/blake3 integrity
 * over the same canonical bytes (ADR-0011).
 *
 * @module
 */

import { blake3 } from '@noble/hashes/blake3';
import { sha256 } from '@noble/hashes/sha256';
import type { ContentAddress } from './brands.js';
import { IntegrityDigest } from './brands.js';
import { fnv1aBytes } from './fnv.js';

/** Pair of identity hash + cryptographic digest over the same canonical bytes. */
export interface AddressedDigest {
  readonly display_id: ContentAddress;
  readonly integrity_digest: IntegrityDigest;
  readonly algo: 'sha256' | 'blake3';
}

const textEncoder = new TextEncoder();

/** Lowercase hex encoding of raw bytes — two chars per byte, no separators, no prefix. */
export const bytesToHex = (bytes: Uint8Array): string => {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i]!.toString(16).padStart(2, '0');
  }
  return out;
};

/**
 * SHA-256 of `input` as PLAIN lowercase hex — no `sha256:` label. The hex HALF
 * of {@link addressedDigestOf}'s `integrity_digest`, for slug consumers that
 * need a bare digest string. The labeled `sha256:`-prefixed receipt form
 * (identity-law #3, ADR-0011) stays SEPARATE — this is not a merge of it.
 * String inputs are hashed as their UTF-8 bytes.
 */
export function sha256Hex(input: Uint8Array | string): string {
  const bytes = typeof input === 'string' ? textEncoder.encode(input) : input;
  return bytesToHex(sha256(bytes));
}

/** Derive an {@link AddressedDigest} from raw bytes. Supports `sha256` and `blake3`. */
export function addressedDigestOf(bytes: Uint8Array, algo: 'sha256' | 'blake3' = 'sha256'): AddressedDigest {
  const display_id = fnv1aBytes(bytes);
  if (algo === 'blake3') {
    const hex = bytesToHex(blake3(bytes));
    return {
      display_id,
      integrity_digest: IntegrityDigest(`blake3:${hex}`),
      algo: 'blake3',
    };
  }
  const hex = bytesToHex(sha256(bytes));
  return {
    display_id,
    integrity_digest: IntegrityDigest(`sha256:${hex}`),
    algo: 'sha256',
  };
}

/** Namespace surface: call {@link AddressedDigest.of} to mint a digest pair from raw bytes. */
export const AddressedDigest = { of: addressedDigestOf };
