/** @czap/genui error contract */
import { describe, it, expect } from 'vitest';
import { DEMO_COMPONENT_CATALOG, validateGeneratedUITree } from '@czap/genui';

describe('@czap/genui error contract', () => {
  it('validateGeneratedUITree rejects unknown components with genui/unknown-component', () => {
    const result = validateGeneratedUITree({ name: 'Unknown', props: {} }, DEMO_COMPONENT_CATALOG);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toMatch(/genui\//);
      expect(result.error.message).toMatch(/Unknown/);
    }
  });
});
