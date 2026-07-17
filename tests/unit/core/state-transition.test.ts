// @vitest-environment node
/**
 * DiscreteStateTransition (#133 correctness) — the typed authority record that
 * REPLACES the dead `discreteSignalPayloadsFromPatch`. This file is typechecked
 * by `tsconfig.tests.json` so the `@ts-expect-error` compile fixture (Law 16) is
 * enforced, not decorative.
 */
import { describe, test, expect } from 'vitest';
import {
  Receipt,
  StateCell,
  StateCellStore,
  applyTransition,
  decodeDiscreteStateTransition,
  discreteTransitionSubjectId,
  mintTransition,
  sealGraph,
  sealNode,
  transitionReceipt,
} from '@czap/core';
import type {
  CellMeta,
  DiscreteStateTransition,
  DocumentGraph,
  DocumentGraphNode,
  SignalNode,
  StateCellShape,
  StateCellStoreShape,
} from '@czap/core';

// Self-contained sealed-node/graph helpers (mirrors ai-cast.test.ts) so this
// typechecked file does not depend on the shared graph-fixtures helper.
const META: CellMeta = {
  created: { wall_ms: 0, counter: 0, node_id: 't' },
  updated: { wall_ms: 0, counter: 0, node_id: 't' },
  version: 1,
};

const node = (input: string): SignalNode =>
  sealNode({
    _tag: 'DocGraphSignalNode',
    _version: 1,
    family: 'signal',
    id: '',
    meta: META,
    input,
  } as unknown as SignalNode);

const graph = (nodes: DocumentGraphNode[]): DocumentGraph =>
  sealGraph({ _tag: 'DocumentGraph', _version: 1, meta: META, nodes, edges: [] } as Omit<
    DocumentGraph,
    'id' | 'digest'
  >);

const baseId = () => graph([node('a')]).id;

const mkTransition = (over: Partial<DiscreteStateTransition> = {}): DiscreteStateTransition => ({
  _tag: 'DiscreteStateTransition',
  _version: 1,
  cell: 'layout',
  next: StateCell.snapshot('layout', 'discrete', 'graph', 'tablet', 1, 0, 1).state,
  generation: 1,
  authority: 'graph',
  base: baseId(),
  kind: 'discrete',
  ...over,
});

describe('DiscreteStateTransition mint reuses the ONE hash law', () => {
  test('transitionReceipt mints a self-consistent, subject-keyed envelope', async () => {
    const transition = mkTransition();
    const receipt = await transitionReceipt(transition);

    // Subject law: `${base}#${cell}` effect subject.
    expect(receipt.kind).toBe('discrete-transition');
    expect(receipt.subject.type).toBe('effect');
    expect(receipt.subject.id).toBe(`${transition.base}#layout`);
    expect(receipt.subject.id).toBe(discreteTransitionSubjectId(transition));

    // Payload rides the TypedRef schema id (the ONE receipt byte law).
    expect(receipt.payload.schema_hash).toBe('DiscreteStateTransition@1');

    // Hash self-consistency — same sha256 kernel Receipt.hashEnvelope recomputes.
    const computed = await Receipt.hashEnvelope(receipt);
    expect(computed).toBe(receipt.hash);
  });

  test('mintTransition builds the transition from prev/next cells + mints its receipt', async () => {
    const store = StateCellStore.create();
    store.register('layout', ['mobile', 'tablet', 'desktop']);
    const prev = store.applyDiscrete('layout', 'mobile');
    const next = store.applyDiscrete('layout', 'tablet');
    const base = baseId();

    const { transition, receipt } = await mintTransition(prev, next, { base });
    expect(transition.cell).toBe('layout');
    expect(transition.previous).toBe('mobile');
    expect(transition.next).toBe('tablet');
    expect(transition.generation).toBe(1);
    expect(transition.authority).toBe('quantizer');
    expect(receipt.subject.id).toBe(`${base}#layout`);
    expect(await Receipt.hashEnvelope(receipt)).toBe(receipt.hash);
  });

  test('a chained mint links onto its predecessor with an advancing HLC', async () => {
    const parent = mkTransition({ next: mkTransition().next, generation: 1 });
    const parentReceipt = await transitionReceipt(parent);
    const child = mkTransition({ generation: 2 });
    const childReceipt = await transitionReceipt(child, {
      previous: parentReceipt.hash,
      timestamp: { wall_ms: parentReceipt.timestamp.wall_ms + 1, counter: 0, node_id: 't' },
    });
    const valid = await Receipt.validateChainDetailed([parentReceipt, childReceipt]).then(
      () => true,
      () => false,
    );
    expect(valid).toBe(true);
  });
});

describe('decodeDiscreteStateTransition is fail-closed', () => {
  test('accepts a well-formed transition', () => {
    const t = mkTransition();
    expect(decodeDiscreteStateTransition(t)).toBe(t);
  });

  test('rejects a non-object', () => {
    expect(() => decodeDiscreteStateTransition(42)).toThrow(/expected an object/i);
  });

  test('rejects the wrong _tag', () => {
    expect(() => decodeDiscreteStateTransition({ ...mkTransition(), _tag: 'GraphPatch' })).toThrow(/_tag/i);
  });

  test('rejects an unsupported _version', () => {
    expect(() => decodeDiscreteStateTransition({ ...mkTransition(), _version: 2 })).toThrow(/_version/i);
  });

  test('rejects a kind other than "discrete" (continuous cannot decode into a transition)', () => {
    expect(() => decodeDiscreteStateTransition({ ...mkTransition(), kind: 'continuous' })).toThrow(/kind/i);
  });
});

describe('applyTransition', () => {
  test('hydrates the named cell via the store generation-safe path', () => {
    const store = StateCellStore.create();
    store.register('layout', ['mobile', 'tablet', 'desktop']);
    const cell = applyTransition(store, mkTransition({ next: mkTransition().next, generation: 3 }));
    expect(cell.state).toBe('tablet');
    expect(cell.generation).toBe(3);
    expect(cell.replayable).toBe(true);
  });
});

/**
 * COMPILE FIXTURE (Law 16) — never invoked; typechecked by tsconfig.tests.json.
 * The replay INPUT is `DiscreteStateTransition`. A continuous StateCell or a raw
 * SignalNode is NOT one and there is no function that turns one into a transition,
 * so passing either to `applyTransition` is a COMPILE ERROR — "widen the SSE
 * replay payload with a signal" is uncompilable.
 */
test('applyTransition type-refuses a continuous cell / raw SignalNode (uncompilable seam)', () => {
  const store: StateCellStoreShape = StateCellStore.create();
  const continuousCell = StateCell.snapshot(
    'scroll.progress',
    'continuous',
    'quantizer',
    'live',
    0,
    1,
    0,
    0.42,
  ) as StateCellShape & { readonly kind: 'continuous' };
  const signalNode: SignalNode = node('workspace.mode');

  // @ts-expect-error a continuous StateCell is NOT a DiscreteStateTransition
  expect(() => applyTransition(store, continuousCell)).toBeTypeOf('function');
  // @ts-expect-error a raw SignalNode is NOT a DiscreteStateTransition
  expect(() => applyTransition(store, signalNode)).toBeTypeOf('function');
});
