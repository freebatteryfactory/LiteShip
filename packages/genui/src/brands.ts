/**
 * Spine-reanchored brand constructors for `@czap/genui`.
 *
 * The {@link ContentAddress} constructor VALIDATES (parse-don't-validate): it
 * throws {@link ValidationError} on input that is not the canonical `fnv1a:` +
 * 8-lowercase-hex shape, so a branded value proves its shape. `@czap/error` is
 * zero-dep and foundational, so this import introduces no cycle.
 *
 * @module
 */

import type { ContentAddress as _ContentAddress } from '@czap/_spine';
import { ValidationError } from '@czap/error';

export type ContentAddress = _ContentAddress;

/**
 * A {@link ContentAddress} is the `fnv1a:` prefix followed by exactly 8 lowercase
 * hex digits — the full width of the FNV-1a 32-bit output.
 */
const CONTENT_ADDRESS_RE = /^fnv1a:[0-9a-f]{8}$/;

/** Type guard: `s` is a syntactically valid {@link ContentAddress}. */
export const isContentAddress = (s: string): s is ContentAddress => CONTENT_ADDRESS_RE.test(s);

/**
 * Wrap canonical fnv1a bytes as a spine {@link ContentAddress}.
 * @throws {@link ValidationError} when `value` is not `fnv1a:` + 8 lowercase hex.
 */
export const ContentAddress = (value: string): ContentAddress => {
  if (!isContentAddress(value)) {
    throw ValidationError('ContentAddress', `expected fnv1a:<8 lowercase hex>, got ${JSON.stringify(value)}`);
  }
  return value as ContentAddress;
};
