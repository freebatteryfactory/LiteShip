import { describe, expect, it } from 'vitest';
import { validateGeneratedUITree } from '@liteship/genui';
import { GENUI_TEST_CATALOG, INVALID_TREE_FAULTS, injectGeneratedUITreeFault } from '../../support/genui-fixtures.js';

const steadyTree = {
  name: 'Root',
  props: { title: 'steady' },
  children: [{ name: 'Text', props: { text: 'safe' } }],
} as const;

describe('generated UI fault simulation', () => {
  it.each(INVALID_TREE_FAULTS)('degrades by refusal and recovers after %s injection', (fault) => {
    expect(validateGeneratedUITree(steadyTree, GENUI_TEST_CATALOG)).toEqual({ ok: true });
    expect(validateGeneratedUITree(injectGeneratedUITreeFault(steadyTree, fault), GENUI_TEST_CATALOG).ok).toBe(false);
    expect(validateGeneratedUITree(steadyTree, GENUI_TEST_CATALOG)).toEqual({ ok: true });
  });
});
