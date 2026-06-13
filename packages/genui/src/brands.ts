/**
 * Spine-reanchored brand constructors for `@czap/genui`.
 *
 * @module
 */

import type { ContentAddress as _ContentAddress } from '@czap/_spine/core';

export type ContentAddress = _ContentAddress;

/** Wrap canonical fnv1a bytes as a spine {@link ContentAddress}. */
export const ContentAddress = (value: string): ContentAddress => value as ContentAddress;
