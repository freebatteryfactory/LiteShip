/**
 * DocumentGraph IR (P2) — the keystone contract: content-addressed nodes (dedup,
 * meta-excluded), order-independent two-law graph addressing, and structural
 * validate/linearize reused from the Plan IR kernel.
 *
 * @module
 */
import { describe, test, expect } from 'vitest';
import { sealNode, sealGraph, validateGraph, linearizeGraph, contentAddressOf } from '@czap/core';
import type {
  SignalNode,
  DocumentGraphNode,
  DocumentGraphEdge,
  DocumentGraph as DocumentGraphType,
  CellMeta,
} from '@czap/core';

const META: CellMeta = {
  created: { wall_ms: 0, counter: 0, node_id: 't' },
  updated: { wall_ms: 0, counter: 0, node_id: 't' },
  version: 1,
};

/** A minimal sealed Signal node keyed by its input axis. */
const node = (input: string): SignalNode =>
  sealNode({
    _tag: 'DocGraphSignalNode',
    _version: 1,
    family: 'signal',
    id: '',
    meta: META,
    input,
  } as unknown as SignalNode);

const graph = (nodes: DocumentGraphNode[], edges: DocumentGraphEdge[]): DocumentGraphType =>
  sealGraph({ _tag: 'DocumentGraph', _version: 1, meta: META, nodes, edges } as Omit<
    DocumentGraphType,
    'id' | 'digest'
  >);

describe('DocumentGraph addressing', () => {
  test('structurally-equal nodes dedup to the same id; distinct payloads differ', () => {
    const a = node('viewport.width');
    const b = node('viewport.width');
    expect(a.id).toBe(b.id);
    expect(a.id).toMatch(/^fnv1a:[0-9a-f]{8}$/);
    expect(node('scroll.y').id).not.toBe(a.id);
  });

  test('node id EXCLUDES the volatile meta (different meta → same id)', () => {
    const a = node('x');
    const b = sealNode({
      ...a,
      meta: { created: { wall_ms: 9, counter: 1, node_id: 'z' }, updated: { wall_ms: 12345, counter: 7, node_id: 'z' }, version: 99 },
    });
    expect(b.id).toBe(a.id);
  });

  test('graph id + digest are order-independent (canonical multiset of nodes + edges)', () => {
    const s1 = node('a');
    const s2 = node('b');
    const s3 = node('c');
    const g1 = graph(
      [s1, s2, s3],
      [
        { from: s1.id, to: s2.id, type: 'seq' },
        { from: s2.id, to: s3.id, type: 'seq' },
      ],
    );
    const g2 = graph(
      [s3, s1, s2],
      [
        { from: s2.id, to: s3.id, type: 'seq' },
        { from: s1.id, to: s2.id, type: 'seq' },
      ],
    );
    expect(g1.id).toBe(g2.id);
    expect(g1.digest.integrity_digest).toBe(g2.digest.integrity_digest);
  });

  test('two-law addressing: fnv1a id + paired sha256 digest over the SAME bytes', () => {
    const g = graph([node('a')], []);
    expect(g.id).toMatch(/^fnv1a:[0-9a-f]{8}$/);
    expect(g.digest.display_id).toBe(g.id);
    expect(g.digest.integrity_digest).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(g.digest.algo).toBe('sha256');
  });

  test('contentAddressOf is the shared kernel — key order does not fork identity', () => {
    expect(contentAddressOf({ a: 1, b: 2 })).toBe(contentAddressOf({ b: 2, a: 1 }));
  });
});

describe('DocumentGraph validate + linearize (reused Plan kernel)', () => {
  test('a valid DAG validates and linearizes in topological order', () => {
    const a = node('a');
    const b = node('b');
    const c = node('c');
    const g = graph(
      [a, b, c],
      [
        { from: a.id, to: b.id, type: 'seq' },
        { from: b.id, to: c.id, type: 'seq' },
      ],
    );
    expect(validateGraph(g)).toEqual({ ok: true });
    const lin = linearizeGraph(g);
    expect(lin.sorted.indexOf(a.id)).toBeLessThan(lin.sorted.indexOf(b.id));
    expect(lin.sorted.indexOf(b.id)).toBeLessThan(lin.sorted.indexOf(c.id));
    expect(lin.cycle).toBeUndefined();
  });

  test('a dangling edge endpoint is a missing_step error', () => {
    const a = node('a');
    const g = graph([a], [{ from: a.id, to: 'fnv1a:deadbeef' as DocumentGraphEdge['to'], type: 'seq' }]);
    const res = validateGraph(g);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors.some((e) => e.type === 'missing_step')).toBe(true);
  });

  test('a cycle is detected by both validate and linearize', () => {
    const a = node('a');
    const b = node('b');
    const g = graph(
      [a, b],
      [
        { from: a.id, to: b.id, type: 'seq' },
        { from: b.id, to: a.id, type: 'seq' },
      ],
    );
    const res = validateGraph(g);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors.some((e) => e.type === 'cycle')).toBe(true);
    expect((linearizeGraph(g).cycle ?? []).length).toBeGreaterThan(0);
  });
});
