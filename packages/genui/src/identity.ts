/**
 * Stable render and catalog identity hashes.
 *
 * @module
 */

import { CanonicalCbor, fnv1aBytes } from '@czap/canonical';
import { hashCatalogInput } from './catalog.js';
import { ContentAddress } from './brands.js';
import type { ComponentCatalog, GeneratedUINode } from './types.js';

/** Canonical hash of a host catalog definition (same bytes as {@link defineComponentCatalog}). */
export function catalogHash(catalog: Pick<ComponentCatalog, 'version' | 'components'>): ContentAddress {
  return hashCatalogInput(catalog);
}

/** Stable identity for a validated tree under a catalog — cache/replay/tests. */
export function renderHash(node: GeneratedUINode, catalog: Pick<ComponentCatalog, 'catalogHash'>): ContentAddress {
  return ContentAddress(
    fnv1aBytes(
      CanonicalCbor.encode({
        catalogHash: catalog.catalogHash,
        node,
      }),
    ),
  );
}
