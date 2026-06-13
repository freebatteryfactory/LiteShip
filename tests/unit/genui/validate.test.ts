/**
 * @czap/genui validation tests.
 */

import { describe, expect, it } from 'vitest';
import { DEMO_COMPONENT_CATALOG, validateGeneratedUITree } from '@czap/genui';

describe('validateGeneratedUITree', () => {
  it('accepts a known demo tree', () => {
    const result = validateGeneratedUITree(
      {
        name: 'Card',
        props: { title: 'Hello' },
        children: [{ name: 'Text', props: { text: 'World' } }],
      },
      DEMO_COMPONENT_CATALOG,
    );
    expect(result.ok).toBe(true);
  });

  it('rejects unknown components with genui/unknown-component', () => {
    const result = validateGeneratedUITree({ name: 'Unknown', props: {} }, DEMO_COMPONENT_CATALOG);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('genui/unknown-component');
    }
  });

  it('rejects invalid props with genui/invalid-prop', () => {
    const result = validateGeneratedUITree({ name: 'Text', props: { text: 42 } }, DEMO_COMPONENT_CATALOG);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('genui/invalid-prop');
    }
  });
});
