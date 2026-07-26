/**
 * FNV-1a hash utility for content addressing.
 *
 * @module
 */

import type { ContentAddress } from './brands.js';
import { ContentAddress as mkContentAddress } from './brands.js';

const textEncoder = new TextEncoder();

/**
 * FNV-1a label of a string's UTF-8 bytes.
 *
 * This is the string convenience projection of {@link fnv1aBytes}; it does
 * not hash JavaScript UTF-16 code units. Therefore the same authored text and
 * its explicit UTF-8 byte sequence cannot silently mint different labels.
 */
export function fnv1a(str: string): ContentAddress {
  return fnv1aBytes(textEncoder.encode(str));
}

/** FNV-1a hash of raw bytes, returned as a ContentAddress. */
export function fnv1aBytes(bytes: Uint8Array): ContentAddress {
  let h = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i]!;
    h = Math.imul(h, 0x01000193);
  }
  return mkContentAddress(`fnv1a:${(h >>> 0).toString(16).padStart(8, '0')}`);
}
