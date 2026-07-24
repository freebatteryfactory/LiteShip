/**
 * Asset identity brands.
 *
 * @module
 */

import { ValidationError } from '@liteship/error';

/** Registered asset id — validated by {@link AssetRegistry} against the module registry. */
export type AssetRefId = string & { readonly __brand: unique symbol };

/** Type guard: `s` is a syntactically well-formed {@link AssetRefId} (non-empty, no whitespace). */
export const isAssetRefId = (s: string): s is AssetRefId => s.length > 0 && !/\s/.test(s);

/**
 * Wrap a registered asset id string as a branded {@link AssetRefId}.
 *
 * The id is a registry KEY (it indexes a `Map`) and is serialized into asset
 * references, so it must be a non-empty token with no whitespace. Registration
 * existence is enforced separately by {@link AssetRegistry}.
 *
 * @throws {@link ValidationError} when `value` is empty or contains whitespace.
 */
export const mkAssetRefId = (value: string): AssetRefId => {
  if (!isAssetRefId(value)) {
    throw ValidationError(
      'mkAssetRefId',
      `asset id must be a non-empty token with no whitespace, got ${JSON.stringify(value)}`,
    );
  }
  return value;
};
