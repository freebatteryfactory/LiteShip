/**
 * @czap/genui validation tests.
 */

import { describe, expect, it } from 'vitest';
import type { ComponentCatalog } from '@czap/genui';
import { defineComponentCatalog, DEMO_COMPONENT_CATALOG, validateGeneratedUITree } from '@czap/genui';

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

  it('rejects a non-object props bag with genui/invalid-prop', () => {
    const result = validateGeneratedUITree(
      { name: 'Text', props: ['not', 'an', 'object'] as unknown as Record<string, unknown> },
      DEMO_COMPONENT_CATALOG,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('genui/invalid-prop');
      expect(result.error.path).toBe('Text.props');
    }
  });

  it('rejects a missing required prop with genui/invalid-prop', () => {
    // Text requires `text`; omit it.
    const result = validateGeneratedUITree({ name: 'Text', props: {} }, DEMO_COMPONENT_CATALOG);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('genui/invalid-prop');
      expect(result.error.message).toMatch(/Missing required prop "text"/);
    }
  });

  it('rejects an unknown prop with genui/invalid-prop', () => {
    const result = validateGeneratedUITree(
      { name: 'Text', props: { text: 'ok', stray: 'x' } },
      DEMO_COMPONENT_CATALOG,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('genui/invalid-prop');
      expect(result.error.message).toMatch(/Unknown prop "stray"/);
    }
  });

  it('allows an optional prop to be omitted', () => {
    // Button.onClick is optional — a Button with only its required label is valid.
    const result = validateGeneratedUITree({ name: 'Button', props: { label: 'Go' } }, DEMO_COMPONENT_CATALOG);
    expect(result.ok).toBe(true);
  });

  it('validates non-string prop types (number / boolean)', () => {
    const catalog = defineComponentCatalog({
      version: 'typed-1',
      components: {
        Gauge: {
          props: { ratio: { type: 'number', required: true }, on: { type: 'boolean', required: true } },
          children: 'none',
        },
      },
    });
    expect(validateGeneratedUITree({ name: 'Gauge', props: { ratio: 0.5, on: true } }, catalog).ok).toBe(true);
    // A non-finite number is rejected.
    const nan = validateGeneratedUITree({ name: 'Gauge', props: { ratio: Number.NaN, on: true } }, catalog);
    expect(nan.ok).toBe(false);
    // A wrong-typed boolean is rejected.
    const badBool = validateGeneratedUITree(
      { name: 'Gauge', props: { ratio: 1, on: 'yes' as unknown as boolean } },
      catalog,
    );
    expect(badBool.ok).toBe(false);
  });

  it('rejects children on a children:"none" component (invalid-children)', () => {
    const result = validateGeneratedUITree(
      { name: 'Text', props: { text: 'x' }, children: [{ name: 'Text', props: { text: 'y' } }] },
      DEMO_COMPONENT_CATALOG,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('genui/invalid-children');
      expect(result.error.message).toMatch(/does not accept children/);
    }
  });

  it('rejects an empty children list on a children:"required" component', () => {
    const catalog = defineComponentCatalog({
      version: 'req-1',
      components: {
        List: { props: {}, children: 'required', allowedChildNames: ['Item'] },
        Item: { props: {}, children: 'none' },
      },
    });
    const result = validateGeneratedUITree({ name: 'List', props: {}, children: [] }, catalog);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('genui/invalid-children');
      expect(result.error.message).toMatch(/requires children/);
    }
  });

  it('rejects a disallowed child name (allowedChildNames)', () => {
    // Card only allows Text/Button children; nest a Card under a Card.
    const result = validateGeneratedUITree(
      {
        name: 'Card',
        props: { title: 'Outer' },
        children: [{ name: 'Card', props: { title: 'Inner' } }],
      },
      DEMO_COMPONENT_CATALOG,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('genui/invalid-children');
      expect(result.error.message).toMatch(/is not allowed under/);
      expect(result.error.path).toBe('Card.children[0]');
    }
  });

  it('recurses into children and surfaces a deep failure path', () => {
    const result = validateGeneratedUITree(
      {
        name: 'Card',
        props: { title: 'Outer' },
        children: [{ name: 'Text', props: { text: 42 } }],
      },
      DEMO_COMPONENT_CATALOG,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('genui/invalid-prop');
      expect(result.error.path).toBe('Card.children[0].props.text');
    }
  });

  it('validates slot nodes — a single slot value', () => {
    const catalog = slotCatalog();
    const ok = validateGeneratedUITree(
      { name: 'Panel', props: {}, slots: { header: { name: 'Text', props: { text: 'h' } } } },
      catalog,
    );
    expect(ok.ok).toBe(true);
  });

  it('validates slot nodes — an array slot value, surfacing a bad slot child', () => {
    const catalog = slotCatalog();
    const result = validateGeneratedUITree(
      {
        name: 'Panel',
        props: {},
        slots: {
          body: [
            { name: 'Text', props: { text: 'ok' } },
            { name: 'Text', props: { text: 99 } },
          ],
        },
      },
      catalog,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('genui/invalid-prop');
      expect(result.error.path).toBe('Panel.slots.body[1].props.text');
    }
  });
});

function slotCatalog(): ComponentCatalog {
  return defineComponentCatalog({
    version: 'slot-1',
    components: {
      Panel: { tag: 'section', props: {}, children: 'optional' },
      Text: { tag: 'p', props: { text: { type: 'string', required: true } }, children: 'none' },
    },
  });
}
