/**
 * Re-export sync {@link AddressedDigest} from `@liteship/canonical`.
 *
 * Types re-anchored to `@liteship/_spine` at the `@liteship/core` export boundary.
 *
 * @module
 */

import { addressedDigestOf } from '@liteship/canonical';
import type { AddressedDigest as _AddressedDigest } from './brands.js';
import { ContentAddress, IntegrityDigest } from './brands.js';

/** Re-exported {@link AddressedDigest} type anchored to spine brands. */
export type AddressedDigest = _AddressedDigest;

/** Derive an {@link AddressedDigest} from raw bytes (sync). */
export function addressedDigestOfCore(bytes: Uint8Array, algo: 'sha256' | 'blake3' = 'sha256'): _AddressedDigest {
  const digest = addressedDigestOf(bytes, algo);
  return {
    display_id: ContentAddress(digest.display_id),
    integrity_digest: IntegrityDigest(digest.integrity_digest),
    algo: digest.algo,
  };
}

/** Namespace surface: call {@link AddressedDigest.of} to mint a digest pair from raw bytes. */
export const AddressedDigest = { of: addressedDigestOfCore };
