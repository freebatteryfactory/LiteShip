/**
 * Host component catalog registration.
 *
 * @module
 */

import { CanonicalCbor, fnv1aBytes } from '@liteship/canonical';
import { ContentAddress } from './brands.js';
import type { ComponentCatalog, ComponentDef } from './types.js';

/** Input to {@link defineComponentCatalog} before content-address minting. */
export interface ComponentCatalogInput {
  readonly version: string;
  readonly components: Readonly<Record<string, ComponentDef>>;
}

/** Canonical catalog bytes recipe shared by {@link defineComponentCatalog} and {@link catalogHash}. */
export function hashCatalogInput(input: Pick<ComponentCatalogInput, 'version' | 'components'>): ContentAddress {
  return ContentAddress(
    fnv1aBytes(
      CanonicalCbor.encode({
        version: input.version,
        components: input.components,
      }),
    ),
  );
}

/**
 * Register a host-owned component catalog. Mints {@link ComponentCatalog.catalogHash}
 * over canonical catalog bytes (version + component defs).
 */
export function defineComponentCatalog(input: ComponentCatalogInput): ComponentCatalog {
  const catalogHash = hashCatalogInput(input);
  return {
    version: input.version,
    catalogHash,
    components: input.components,
  };
}
