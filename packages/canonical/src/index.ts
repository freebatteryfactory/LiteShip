/**
 * `@czap/canonical` — self-contained canonical bytes kernel.
 *
 * @module
 */

export { CanonicalCbor } from './cbor.js';
export { decode } from './cbor-decode.js';
export { ContentAddress, IntegrityDigest } from './brands.js';
export { fnv1a, fnv1aBytes } from './fnv.js';
export { AddressedDigest, addressedDigestOf } from './addressed-digest.js';
