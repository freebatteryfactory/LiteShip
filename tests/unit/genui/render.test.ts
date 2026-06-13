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

  it('renders named slots under data-czap-genui-slot containers', () => {
    const target = document.createElement('div');
    const ok = renderFromCatalog(
      {
        name: 'Card',
        props: { title: 'Hello' },
        slots: {
          footer: { name: 'Text', props: { text: 'foot' } },
        },
      },
      { catalog: DEMO_COMPONENT_CATALOG, target },
    );
    expect(ok).toBe(true);
    const slot = target.querySelector('[data-czap-genui-slot="footer"]');
    expect(slot?.textContent).toBe('foot');
  });

  it('does not multiply interaction listeners across re-renders', () => {
    const target = document.createElement('div');
    const eventRoot = document.createElement('div');
    let clicks = 0;
    eventRoot.addEventListener('genui:interaction', () => {
      clicks += 1;
    });

    const tree = {
      name: 'Button',
      props: { label: 'Go', onClick: 'submit' },
    };

    renderFromCatalog(tree, { catalog: DEMO_COMPONENT_CATALOG, target, eventRoot });
    renderFromCatalog(tree, { catalog: DEMO_COMPONENT_CATALOG, target, eventRoot });

    target.querySelector('button')?.click();
    expect(clicks).toBe(1);
  });

  it('surfaces action ids on genui:interaction', () => {
    const target = document.createElement('div');
    const eventRoot = document.createElement('div');
    let actionId: string | undefined;
    eventRoot.addEventListener('genui:interaction', (event) => {
      actionId = (event as CustomEvent<{ actionId: string }>).detail.actionId;
    });

    renderFromCatalog(
      { name: 'Button', props: { label: 'Save', onClick: 'save-draft' } },
      { catalog: DEMO_COMPONENT_CATALOG, target, eventRoot },
    );

    target.querySelector('button')?.click();
    expect(actionId).toBe('save-draft');
  });
});
