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

/** Snapshot exactly the catalog grammar before hashing and public retention. */
function snapshotComponents(
  components: Readonly<Record<string, ComponentDef>>,
): Readonly<Record<string, ComponentDef>> {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(components).map(([name, definition]) => {
        const props = Object.freeze(
          Object.fromEntries(
            Object.entries(definition.props).map(([propName, prop]) => [
              propName,
              Object.freeze({
                type: prop.type,
                ...(prop.required === undefined ? {} : { required: prop.required }),
              }),
            ]),
          ),
        );
        const snapshot = Object.freeze({
          props,
          ...(definition.children === undefined ? {} : { children: definition.children }),
          ...(definition.allowedChildNames === undefined
            ? {}
            : { allowedChildNames: Object.freeze([...definition.allowedChildNames]) }),
          ...(definition.tag === undefined ? {} : { tag: definition.tag }),
        });
        return [name, snapshot] as const;
      }),
    ),
  );
}

/**
 * Register a host-owned component catalog. Mints {@link ComponentCatalog.catalogHash}
 * over canonical catalog bytes (version + component defs).
 */
export function defineComponentCatalog(input: ComponentCatalogInput): ComponentCatalog {
  const components = snapshotComponents(input.components);
  const catalogHash = hashCatalogInput({ version: input.version, components });
  return Object.freeze({
    version: input.version,
    catalogHash,
    components,
  });
}
