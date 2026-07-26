import { describe, expect, it } from 'vitest';
import {
  defineComponentCatalog,
  validateGeneratedUITree,
  type GeneratedUINode,
  type GeneratedUIValidationError,
} from '@liteship/genui';

const catalog = defineComponentCatalog({
  version: 'mcdc-v1',
  components: {
    Leaf: { props: { text: { type: 'string', required: true } }, children: 'none' },
    Gauge: {
      props: { ratio: { type: 'number', required: true }, enabled: { type: 'boolean', required: true } },
      children: 'none',
    },
    Button: {
      props: { label: { type: 'string', required: true }, onClick: { type: 'string' }, onHover: { type: 'string' } },
      children: 'none',
    },
    Optional: { props: {}, children: 'optional', allowedChildNames: ['Leaf'] },
    Required: { props: {}, children: 'required', allowedChildNames: ['Leaf'] },
    Link: { props: { href: { type: 'string', required: true } }, children: 'none' },
  },
});

type ErrorCode = GeneratedUIValidationError['code'];
interface DecisionCase {
  readonly decision: string;
  readonly node: GeneratedUINode;
  readonly expected: true | ErrorCode;
}

const leaf = (): GeneratedUINode => ({ name: 'Leaf', props: { text: 'ok' } });

const cases: readonly DecisionCase[] = [
  { decision: 'component-own-key/true', node: leaf(), expected: true },
  { decision: 'component-own-key/false', node: { name: 'Unknown', props: {} }, expected: 'genui/unknown-component' },
  {
    decision: 'props-plain/false',
    node: { name: 'Leaf', props: [] as unknown as Record<string, unknown> },
    expected: 'genui/invalid-prop',
  },
  { decision: 'required-present/false', node: { name: 'Leaf', props: {} }, expected: 'genui/invalid-prop' },
  { decision: 'string-type/false', node: { name: 'Leaf', props: { text: 1 } }, expected: 'genui/invalid-prop' },
  { decision: 'number-finite/true', node: { name: 'Gauge', props: { ratio: 1, enabled: true } }, expected: true },
  {
    decision: 'number-finite/false',
    node: { name: 'Gauge', props: { ratio: Number.NaN, enabled: true } },
    expected: 'genui/invalid-prop',
  },
  {
    decision: 'boolean-type/false',
    node: { name: 'Gauge', props: { ratio: 1, enabled: 'true' } },
    expected: 'genui/invalid-prop',
  },
  {
    decision: 'interaction-onClick-string/true',
    node: { name: 'Button', props: { label: 'go', onClick: 'open' } },
    expected: true,
  },
  {
    decision: 'interaction-onClick-string/false',
    node: { name: 'Button', props: { label: 'go', onClick: 1 } },
    expected: 'genui/invalid-prop',
  },
  {
    decision: 'interaction-supported-key/false',
    node: { name: 'Button', props: { label: 'go', onHover: 'open' } },
    expected: 'genui/invalid-prop',
  },
  {
    decision: 'prop-known/false',
    node: { name: 'Leaf', props: { text: 'ok', html: '<b>' } },
    expected: 'genui/invalid-prop',
  },
  {
    decision: 'children-array/false',
    node: { name: 'Optional', props: {}, children: {} as unknown as readonly GeneratedUINode[] },
    expected: 'genui/invalid-children',
  },
  {
    decision: 'children-none/false',
    node: { name: 'Leaf', props: { text: 'ok' }, children: [leaf()] },
    expected: 'genui/invalid-children',
  },
  {
    decision: 'children-required/false',
    node: { name: 'Required', props: {}, children: [] },
    expected: 'genui/invalid-children',
  },
  { decision: 'allowed-child/true', node: { name: 'Optional', props: {}, children: [leaf()] }, expected: true },
  {
    decision: 'allowed-child/false',
    node: { name: 'Optional', props: {}, children: [{ name: 'Button', props: { label: 'x' } }] },
    expected: 'genui/invalid-children',
  },
  { decision: 'slots-record/true', node: { name: 'Optional', props: {}, slots: { summary: leaf() } }, expected: true },
  {
    decision: 'slots-record/false',
    node: { name: 'Optional', props: {}, slots: null as unknown as GeneratedUINode['slots'] },
    expected: 'genui/invalid-slots',
  },
  {
    decision: 'slot-array-recursion/false',
    node: { name: 'Optional', props: {}, slots: { body: [leaf(), { name: 'Leaf', props: {} }] } },
    expected: 'genui/invalid-prop',
  },
  {
    decision: 'slot-child-containment/false',
    node: { name: 'Optional', props: {}, slots: { body: { name: 'Button', props: { label: 'x' } } } },
    expected: 'genui/invalid-children',
  },
  {
    decision: 'href-scheme/true',
    node: { name: 'Link', props: { href: '/docs' } },
    expected: true,
  },
  {
    decision: 'href-scheme/false',
    node: { name: 'Link', props: { href: 'java\nscript:alert(1)' } },
    expected: 'genui/invalid-prop',
  },
];

describe('generated UI validator decision table', () => {
  it.each(cases)('$decision', ({ node, expected }) => {
    const result = validateGeneratedUITree(node, catalog);
    if (expected === true) expect(result).toEqual({ ok: true });
    else {
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe(expected);
    }
  });

  it('names every decision witness exactly once', () => {
    expect(new Set(cases.map((entry) => entry.decision)).size).toBe(cases.length);
  });
});
