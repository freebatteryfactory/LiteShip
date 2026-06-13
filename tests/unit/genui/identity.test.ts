/**
 * @czap/genui identity hash tests.
 */

import { describe, expect, it } from 'vitest';
import { catalogHash, defineComponentCatalog, DEMO_COMPONENT_CATALOG, renderHash } from '@czap/genui';

describe('genui identity hashes', () => {
  it('catalogHash matches defineComponentCatalog.catalogHash', () => {
    expect(catalogHash(DEMO_COMPONENT_CATALOG)).toBe(DEMO_COMPONENT_CATALOG.catalogHash);
  });

  it('renderHash is stable for the same tree and catalog', () => {
    const node = { name: 'Text', props: { text: 'stable' } };
    const a = renderHash(node, DEMO_COMPONENT_CATALOG);
    const b = renderHash(node, DEMO_COMPONENT_CATALOG);
    expect(a).toBe(b);
  });

  it('catalogHash changes when component defs change', () => {
    const base = defineComponentCatalog({
      version: 'v1',
      components: { Box: { props: { label: { type: 'string' } }, children: 'none' } },
    });
    const changed = defineComponentCatalog({
      version: 'v1',
      components: { Box: { props: { title: { type: 'string' } }, children: 'none' } },
    });
    expect(base.catalogHash).not.toBe(changed.catalogHash);
  });
});
