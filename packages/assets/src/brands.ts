/**
 * Asset identity brands.
 *
 * @module
 */

/** Registered asset id — validated by {@link AssetRef} against the module registry. */
export type AssetRefId = string & { readonly __brand: unique symbol };

/** Wrap a registered asset id string as a branded {@link AssetRefId}. */
export const mkAssetRefId = (value: string): AssetRefId => value as AssetRefId;
