import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { renderHash, validateGeneratedUITree } from '@liteship/genui';
import {
  GENUI_TEST_CATALOG,
  INVALID_TREE_FAULTS,
  injectGeneratedUITreeFault,
  validGeneratedUITreeArbitrary,
} from '../support/genui-fixtures.js';

describe('generated UI tree laws', () => {
  it('accepts generated valid trees without mutating tree or catalog', () => {
    fc.assert(
      fc.property(validGeneratedUITreeArbitrary, (tree) => {
        const treeBefore = JSON.stringify(tree);
        const catalogBefore = JSON.stringify(GENUI_TEST_CATALOG);
        expect(validateGeneratedUITree(tree, GENUI_TEST_CATALOG)).toEqual({ ok: true });
        expect(JSON.stringify(tree)).toBe(treeBefore);
        expect(JSON.stringify(GENUI_TEST_CATALOG)).toBe(catalogBefore);
        expect(renderHash(tree, GENUI_TEST_CATALOG)).toBe(renderHash(tree, GENUI_TEST_CATALOG));
      }),
      { numRuns: 300 },
    );
  });

  it('rejects every generated invalid family and preserves the valid source tree', () => {
    fc.assert(
      fc.property(validGeneratedUITreeArbitrary, fc.constantFrom(...INVALID_TREE_FAULTS), (tree, fault) => {
        const before = JSON.stringify(tree);
        expect(validateGeneratedUITree(injectGeneratedUITreeFault(tree, fault), GENUI_TEST_CATALOG).ok).toBe(false);
        expect(JSON.stringify(tree)).toBe(before);
        expect(validateGeneratedUITree(tree, GENUI_TEST_CATALOG)).toEqual({ ok: true });
      }),
      { numRuns: 300 },
    );
  });
});
