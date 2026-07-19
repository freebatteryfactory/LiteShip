/**
 * Trusted catalog renderer tests (jsdom).
 */

// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { defineComponentCatalog, DEMO_COMPONENT_CATALOG, renderFromCatalog } from '@liteship/genui';

describe('@liteship/genui renderFromCatalog', () => {
  it('renders trusted components without executing script-like prop strings', () => {
    const target = document.createElement('div');
    const { ok } = renderFromCatalog(
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
    const { ok } = renderFromCatalog({ name: 'Missing', props: {} }, { catalog: DEMO_COMPONENT_CATALOG, target, clear: false });
    expect(ok).toBe(false);
    expect(target.textContent).toBe('keep');
  });

  it('renders named slots under data-liteship-genui-slot containers', () => {
    const target = document.createElement('div');
    const { ok } = renderFromCatalog(
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
    const slot = target.querySelector('[data-liteship-genui-slot="footer"]');
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

  it('renders allowlisted attributes including data-/aria- prefixed ones', () => {
    const catalog = defineComponentCatalog({
      version: 'attr-1',
      components: {
        Link: {
          tag: 'a',
          props: {
            href: { type: 'string' },
            class: { type: 'string' },
            'aria-label': { type: 'string' },
            'data-track': { type: 'string' },
          },
          children: 'none',
        },
      },
    });
    const target = document.createElement('div');
    const { ok } = renderFromCatalog(
      {
        name: 'Link',
        props: {
          href: '/x',
          class: 'btn',
          'aria-label': 'go',
          'data-track': 'cta',
        },
      },
      { catalog, target },
    );
    expect(ok).toBe(true);
    const a = target.querySelector('a')!;
    expect(a.getAttribute('href')).toBe('/x');
    expect(a.getAttribute('class')).toBe('btn');
    expect(a.getAttribute('aria-label')).toBe('go');
    expect(a.getAttribute('data-track')).toBe('cta');
  });

  it('does not set a declared-but-non-allowlisted string attribute', () => {
    // `style` is declared on the def but is NOT in the attribute allowlist, so
    // applyProps skips the setAttribute branch.
    const catalog = defineComponentCatalog({
      version: 'attr-2',
      components: {
        Box: { tag: 'div', props: { style: { type: 'string' } }, children: 'none' },
      },
    });
    const target = document.createElement('div');
    renderFromCatalog({ name: 'Box', props: { style: 'color:red' } }, { catalog, target });
    expect(target.querySelector('div')?.hasAttribute('style')).toBe(false);
  });

  it('writes the `label` string prop as textContent (label branch)', () => {
    const target = document.createElement('div');
    renderFromCatalog(
      { name: 'Button', props: { label: 'Press' } },
      { catalog: DEMO_COMPONENT_CATALOG, target },
    );
    expect(target.querySelector('button')?.textContent).toBe('Press');
  });

  it('rejects a registered non-onClick handler at validation (loud, not silently dropped)', () => {
    const catalog = defineComponentCatalog({
      version: 'evt-1',
      components: {
        Box: { tag: 'div', props: { onHover: { type: 'string' } }, children: 'none' },
      },
    });
    const target = document.createElement('div');
    const result = renderFromCatalog({ name: 'Box', props: { onHover: 'noop' } }, { catalog, target });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('genui/invalid-prop');
      expect(result.error.message).toMatch(/onHover/);
    }
    expect(target.childElementCount).toBe(0);
  });

  it('rejects a non-string onClick at validation', () => {
    const catalog = defineComponentCatalog({
      version: 'evt-2',
      components: {
        Box: { tag: 'div', props: { onClick: { type: 'number' } }, children: 'none' },
      },
    });
    const target = document.createElement('div');
    const result = renderFromCatalog(
      { name: 'Box', props: { onClick: 5 as unknown as string } },
      { catalog, target },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('genui/invalid-prop');
    expect(target.childElementCount).toBe(0);
  });

  it('renders an array slot value into a single slot host', () => {
    const catalog = defineComponentCatalog({
      version: 'slot-r1',
      components: {
        Panel: { tag: 'section', props: {}, children: 'optional' },
        Text: { tag: 'p', props: { text: { type: 'string', required: true } }, children: 'none' },
      },
    });
    const target = document.createElement('div');
    const { ok } = renderFromCatalog(
      {
        name: 'Panel',
        props: {},
        slots: {
          body: [
            { name: 'Text', props: { text: 'a' } },
            { name: 'Text', props: { text: 'b' } },
          ],
        },
      },
      { catalog, target },
    );
    expect(ok).toBe(true);
    const slot = target.querySelector('[data-liteship-genui-slot="body"]')!;
    expect(slot.querySelectorAll('p')).toHaveLength(2);
    expect(slot.textContent).toBe('ab');
  });

  it('renders child nodes under the parent element', () => {
    const target = document.createElement('div');
    const { ok } = renderFromCatalog(
      {
        name: 'Card',
        props: { title: 'T' },
        children: [
          { name: 'Text', props: { text: 'one' } },
          { name: 'Text', props: { text: 'two' } },
        ],
      },
      { catalog: DEMO_COMPONENT_CATALOG, target },
    );
    expect(ok).toBe(true);
    expect(target.querySelectorAll('section > p')).toHaveLength(2);
  });

  it('falls back to a div tag when the component def omits one', () => {
    const catalog = defineComponentCatalog({
      version: 'tagless-1',
      components: { Bare: { props: {}, children: 'none' } },
    });
    const target = document.createElement('div');
    renderFromCatalog({ name: 'Bare', props: {} }, { catalog, target });
    expect(target.firstElementChild?.tagName).toBe('DIV');
  });

  it('preserves prior content when clear:false is passed', () => {
    const target = document.createElement('div');
    const keep = document.createElement('span');
    keep.textContent = 'keep';
    target.appendChild(keep);
    renderFromCatalog(
      { name: 'Text', props: { text: 'added' } },
      { catalog: DEMO_COMPONENT_CATALOG, target, clear: false },
    );
    expect(target.querySelector('span')?.textContent).toBe('keep');
    expect(target.querySelector('p')?.textContent).toBe('added');
  });
});
