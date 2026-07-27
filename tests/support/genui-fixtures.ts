/** Shared generated-UI fixtures and generators for property, fuzz, and scale proofs. */

import fc from 'fast-check';
import { defineComponentCatalog, type GeneratedUINode } from '@liteship/genui';

export const GENUI_TEST_CATALOG = defineComponentCatalog({
  version: 'assurance-v1',
  components: {
    Root: {
      tag: 'main',
      props: { title: { type: 'string', required: true } },
      children: 'optional',
      allowedChildNames: ['Text', 'Button', 'Root', 'Link'],
    },
    Text: { tag: 'p', props: { text: { type: 'string', required: true } }, children: 'none' },
    Button: {
      tag: 'button',
      props: { label: { type: 'string', required: true }, onClick: { type: 'string' } },
      children: 'none',
    },
    Link: { tag: 'a', props: { href: { type: 'string', required: true } }, children: 'none' },
  },
});

const textNodeArbitrary = fc
  .string({ maxLength: 48 })
  .map((text): GeneratedUINode => ({ name: 'Text', props: { text } }));
const buttonNodeArbitrary = fc
  .record({ label: fc.string({ maxLength: 32 }), actionId: fc.option(fc.string({ minLength: 1, maxLength: 24 })) })
  .map(({ label, actionId }): GeneratedUINode => ({
    name: 'Button',
    props: { label, ...(actionId === null ? {} : { onClick: actionId }) },
  }));

/** Bounded typed-valid trees; generated data, not a fixed example table. */
export const validGeneratedUITreeArbitrary = fc
  .record({
    title: fc.string({ maxLength: 48 }),
    children: fc.array(fc.oneof(textNodeArbitrary, buttonNodeArbitrary), { maxLength: 32 }),
    slot: fc.option(textNodeArbitrary),
  })
  .map(({ title, children, slot }): GeneratedUINode => ({
    name: 'Root',
    props: { title },
    children,
    ...(slot === null ? {} : { slots: { summary: slot } }),
  }));

export type InvalidTreeFault =
  | 'unknown-component'
  | 'missing-required-prop'
  | 'wrong-prop-type'
  | 'unknown-prop'
  | 'children-on-leaf'
  | 'disallowed-child'
  | 'disallowed-slot-child'
  | 'invalid-slots'
  | 'unsafe-href';

export const INVALID_TREE_FAULTS: readonly InvalidTreeFault[] = [
  'unknown-component',
  'missing-required-prop',
  'wrong-prop-type',
  'unknown-prop',
  'children-on-leaf',
  'disallowed-child',
  'disallowed-slot-child',
  'invalid-slots',
  'unsafe-href',
];

/** Inject exactly one validator fault while leaving the source tree untouched. */
export function injectGeneratedUITreeFault(tree: GeneratedUINode, fault: InvalidTreeFault): GeneratedUINode {
  switch (fault) {
    case 'unknown-component':
      return { ...tree, name: 'ModelOwnedScript' };
    case 'missing-required-prop':
      return { ...tree, props: {} };
    case 'wrong-prop-type':
      return { ...tree, props: { title: 42 } };
    case 'unknown-prop':
      return { ...tree, props: { ...tree.props, modelHtml: '<script>' } };
    case 'children-on-leaf':
      return { name: 'Text', props: { text: 'leaf' }, children: [{ name: 'Text', props: { text: 'nested' } }] };
    case 'disallowed-child':
      return { ...tree, children: [{ name: 'ModelOwnedScript', props: {} }] };
    case 'disallowed-slot-child':
      return { ...tree, slots: { model: { name: 'ModelOwnedScript', props: {} } } };
    case 'invalid-slots':
      return { ...tree, slots: [] as unknown as GeneratedUINode['slots'] };
    case 'unsafe-href':
      return { name: 'Link', props: { href: 'javascript:alert(1)' } };
  }
}

/** A balanced, bounded tree with exactly `nodeCount` nodes for scale curves. */
export function buildGeneratedUITree(nodeCount: number): GeneratedUINode {
  if (!Number.isInteger(nodeCount) || nodeCount < 1) throw new RangeError('nodeCount must be a positive integer');
  interface MutableRootNode {
    readonly name: 'Root';
    readonly props: { readonly title: string };
    readonly children: GeneratedUINode[];
  }
  let remaining = nodeCount - 1;
  const root: MutableRootNode = {
    name: 'Root',
    props: { title: `tree-${nodeCount}` },
    children: [],
  };
  const queue = [root];
  let serial = 0;
  while (remaining > 0) {
    const parent = queue.shift();
    if (parent === undefined) break;
    for (let branch = 0; branch < 2 && remaining > 0; branch++) {
      if (remaining > 1) {
        const child: MutableRootNode = {
          name: 'Root',
          props: { title: `branch-${serial++}` },
          children: [],
        };
        parent.children.push(child);
        queue.push(child);
      } else {
        parent.children.push({ name: 'Text', props: { text: `leaf-${serial++}` } });
      }
      remaining--;
    }
  }
  return root;
}
