/**
 * @czap/genui catalog definition tests.
 *
 * `defineComponentCatalog` mints a content address over the canonical catalog
 * bytes (version + component defs). These tests pin its determinism and the
 * version/def sensitivity of the minted `catalogHash`.
 */

import { describe, expect, it } from 'vitest';
import type { ComponentDef } from '@czap/genui';
import { defineComponentCatalog } from '@czap/genui';

const components: Readonly<Record<string, ComponentDef>> = {
  Box: { tag: 'div', props: { label: { type: 'string', required: true } }, children: 'none' },
};

describe('defineComponentCatalog', () => {
  it('returns the input version and components verbatim', () => {
    const catalog = defineComponentCatalog({ version: 'v1', components });
    expect(catalog.version).toBe('v1');
    expect(catalog.components).toBe(components);
  });

  it('mints a content-addressed catalogHash over the canonical bytes', () => {
    const catalog = defineComponentCatalog({ version: 'v1', components });
    // ContentAddress is fnv1a over CanonicalCbor bytes — a non-empty branded string.
    expect(typeof catalog.catalogHash).toBe('string');
    expect(String(catalog.catalogHash).length).toBeGreaterThan(0);
  });

  it('is deterministic — same input mints the same catalogHash', () => {
    const a = defineComponentCatalog({ version: 'v1', components });
    const b = defineComponentCatalog({ version: 'v1', components });
    expect(a.catalogHash).toBe(b.catalogHash);
  });

  it('pins version into the hash — bumping only the version changes catalogHash', () => {
    const v1 = defineComponentCatalog({ version: 'v1', components });
    const v2 = defineComponentCatalog({ version: 'v2', components });
    expect(v2.catalogHash).not.toBe(v1.catalogHash);
  });

  it('is sensitive to component prop defs — changing a prop name changes catalogHash', () => {
    const base = defineComponentCatalog({
      version: 'v1',
      components: { Box: { props: { label: { type: 'string' } }, children: 'none' } },
    });
    const changed = defineComponentCatalog({
      version: 'v1',
      components: { Box: { props: { title: { type: 'string' } }, children: 'none' } },
    });
    expect(changed.catalogHash).not.toBe(base.catalogHash);
  });

  it('is sensitive to the component set — adding a component changes catalogHash', () => {
    const one = defineComponentCatalog({
      version: 'v1',
      components: { Box: { props: {}, children: 'none' } },
    });
    const two = defineComponentCatalog({
      version: 'v1',
      components: {
        Box: { props: {}, children: 'none' },
        Note: { props: {}, children: 'none' },
      },
    });
    expect(two.catalogHash).not.toBe(one.catalogHash);
  });

  it('canonicalizes component key order — same defs in a different order hash equal', () => {
    const ab = defineComponentCatalog({
      version: 'v1',
      components: {
        A: { props: { x: { type: 'string' } }, children: 'none' },
        B: { props: { y: { type: 'number' } }, children: 'none' },
      },
    });
    const ba = defineComponentCatalog({
      version: 'v1',
      components: {
        B: { props: { y: { type: 'number' } }, children: 'none' },
        A: { props: { x: { type: 'string' } }, children: 'none' },
      },
    });
    expect(ba.catalogHash).toBe(ab.catalogHash);
  });
});
