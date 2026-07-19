/**
 * Re-export FNV-1a helpers from `@liteship/canonical`, re-anchored to spine brands.
 * @module
 */

import { fnv1a as canonicalFnv1a, fnv1aBytes as canonicalFnv1aBytes } from '@liteship/canonical';
import type { ContentAddress } from './brands.js';
import { ContentAddress as mkContentAddress } from './brands.js';

/** FNV-1a hash of a string, returned as a spine {@link ContentAddress}. */
export function fnv1a(str: string): ContentAddress {
  return mkContentAddress(canonicalFnv1a(str));
}

/** FNV-1a hash of raw bytes, returned as a spine {@link ContentAddress}. */
export function fnv1aBytes(bytes: Uint8Array): ContentAddress {
  return mkContentAddress(canonicalFnv1aBytes(bytes));
}
