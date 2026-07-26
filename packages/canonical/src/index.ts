/**
 * `@liteship/canonical` — self-contained canonical bytes kernel.
 *
 * @module
 */

export { CanonicalCbor } from './cbor.js';
export { decode } from './cbor-decode.js';
export { isCanonicalCborRecord, isCanonicalCborValue } from './value-domain.js';
export type { CanonicalCborValue } from './value-domain.js';
export { canonicalJson } from './canonical-json.js';
export { ContentAddress, IntegrityDigest } from './brands.js';
export { fnv1a, fnv1aBytes } from './fnv.js';
export { AddressedDigest, addressedDigestOf, bytesToHex, sha256Hex } from './addressed-digest.js';
