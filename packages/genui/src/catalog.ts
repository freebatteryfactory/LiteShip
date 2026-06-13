/**
 * Host component catalog registration.
 *
 * @module
 */

import { CanonicalCbor, fnv1aBytes } from '@czap/canonical';
import { ContentAddress } from './brands.js';
import type { ComponentCatalog, ComponentDef } from './types.js';

/** Input to {@link defineComponentCatalog} before content-address minting. */
export interface ComponentCatalogInput {
  readonly version: string;
  readonly components: Readonly<Record<string, ComponentDef>>;
}

/**
 * Register a host-owned component catalog. Mints {@link ComponentCatalog.catalogHash}
 * over canonical catalog bytes (version + component defs).
 */
export function defineComponentCatalog(input: ComponentCatalogInput): ComponentCatalog {
  const catalogHash = ContentAddress(
    fnv1aBytes(
      CanonicalCbor.encode({
        version: input.version,
        components: input.components,
      }),
    ),
  );
  return {
    version: input.version,
    catalogHash,
    components: input.components,
  };
}
