/**
 * Trusted catalog renderer tests (jsdom).
 */

// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { DEMO_COMPONENT_CATALOG, renderFromCatalog } from '@czap/genui';

describe('@czap/genui renderFromCatalog', () => {
  it('renders trusted components without executing script-like prop strings', () => {
    const target = document.createElement('div');
    const ok = renderFromCatalog(
      {
        name: 'Text',
        props: { text: '<img src=x onerror=alert(1)>' },
      },
      { catalog: DEMO_COMPONENT_CATALOG, target },
    );
    expect(ok).toBe(true);
    expect(target.textContent).toBe('<img src=x onerror=alert(1)>');
    expect(target.querySelector('img')).toBeNull();
  });

  it('rejects unknown components without mutating the target', () => {
    const target = document.createElement('div');
    target.textContent = 'keep';
    const ok = renderFromCatalog({ name: 'Missing', props: {} }, { catalog: DEMO_COMPONENT_CATALOG, target, clear: false });
    expect(ok).toBe(false);
    expect(target.textContent).toBe('keep');
  });
});
