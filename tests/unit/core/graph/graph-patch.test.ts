/**
 * GraphPatch (P5b) — the tagged-delta mutation contract over the DocumentGraph
 * IR: propose/apply RE-ADDRESSES (new id differs); validate catches a patch that
 * would introduce a cycle or a dangling edge; diff round-trips
 * (`apply(a, diff(a, b))` deep-equals `b`); receipt mints through the byte law.
 *
 * @module
 */
import { describe, test, expect } from 'vitest';
import { GraphPatch, sealNode, sealGraph } from '@liteship/core';
import type {
  SignalNode,
  DocumentGraphNode,
  DocumentGraphEdge,
  DocumentGraph as DocumentGraphType,
  CellMeta,
} from '@liteship/core';

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

describe('GraphPatch propose + apply (re-addressing)', () => {
  test('propose stamps resultId; apply re-addresses so the graph id differs', () => {
    const a = node('a');
    const base = graph([a], []);
    const b = node('b');

    const patch = GraphPatch.propose(base, [{ op: 'add', family: 'signal', node: b }]);
    expect(patch._tag).toBe('GraphPatch');
    expect(patch._version).toBe(1);
    expect(patch.base).toBe(base.id);

    const next = GraphPatch.apply(base, patch);
    // RE-ADDRESSED through sealGraph: a new node ⇒ a new graph id + digest.
    expect(next.id).not.toBe(base.id);
    expect(next.digest.integrity_digest).not.toBe(base.digest.integrity_digest);
    // propose previewed the same apply, so resultId matches the committed id.
    expect(patch.resultId).toBe(next.id);
    expect(next.nodes.map((n) => n.id).sort()).toEqual([a.id, b.id].sort());
  });

  test('preview equals apply (same bytes, intent-named)', () => {
    const base = graph([node('a')], []);
    const patch = GraphPatch.propose(base, [{ op: 'add', family: 'signal', node: node('b') }]);
    expect(GraphPatch.preview(base, patch)).toEqual(GraphPatch.apply(base, patch));
  });

  test('remove op drops a node and re-addresses back toward the smaller graph', () => {
    const a = node('a');
    const b = node('b');
    const base = graph([a, b], []);
    const patch = GraphPatch.propose(base, [{ op: 'remove', family: 'signal', node: b }]);
    const next = GraphPatch.apply(base, patch);
    expect(next.nodes.map((n) => n.id)).toEqual([a.id]);
    // Removing b yields the same id as a graph authored with only a.
    expect(next.id).toBe(graph([a], []).id);
  });

  test('update REPLACES the node in the same logical cell (no orphan) and round-trips a payload change', () => {
    // Same logical cell 'signal x' (same input axis), different payload (one carries a
    // range) ⇒ different content id but the SAME logicalKey.
    const sigA = node('x');
    const sigB = sealNode({
      _tag: 'DocGraphSignalNode',
      _version: 1,
      family: 'signal',
      id: '',
      meta: META,
      input: 'x',
      range: [0, 1],
    } as unknown as SignalNode);
    expect(sigB.id).not.toBe(sigA.id);

    const a = graph([sigA], []);
    const b = graph([sigB], []);
    const patch = GraphPatch.diff(a, b);
    // diff collapses the remove+add of the same cell into a single `update`.
    expect(patch.ops.some((o) => 'op' in o && (o as { op: string }).op === 'update')).toBe(true);

    // apply REPLACES (drops sigA, installs sigB) — exactly one node, not two — so the
    // payload-change round-trip holds: apply(a, diff(a,b)) === b.
    const next = GraphPatch.apply(a, patch);
    expect(next.nodes.map((n) => n.id)).toEqual([sigB.id]); // NOT [sigA.id, sigB.id]
    expect(next.id).toBe(b.id);
  });
});

describe('GraphPatch validate (re-runs validateGraph on the apply result)', () => {
  test('a structurally-sound patch validates ok', () => {
    const a = node('a');
    const b = node('b');
    const base = graph([a], []);
    const patch = GraphPatch.propose(base, [
      { op: 'add', family: 'signal', node: b },
      { op: 'add', edge: { from: a.id, to: b.id, type: 'seq' } },
    ]);
    expect(GraphPatch.validate(base, patch)).toEqual({ ok: true });
  });

  test('a patch that introduces a dangling edge fails validation', () => {
    const a = node('a');
    const base = graph([a], []);
    const patch = GraphPatch.propose(base, [
      { op: 'add', edge: { from: a.id, to: 'fnv1a:deadbeef' as DocumentGraphEdge['to'], type: 'seq' } },
    ]);
    const res = GraphPatch.validate(base, patch);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors.some((e) => e.type === 'missing_step')).toBe(true);
  });

  test('a patch that introduces a cycle fails validation', () => {
    const a = node('a');
    const b = node('b');
    const base = graph([a, b], [{ from: a.id, to: b.id, type: 'seq' }]);
    const patch = GraphPatch.propose(base, [{ op: 'add', edge: { from: b.id, to: a.id, type: 'seq' } }]);
    const res = GraphPatch.validate(base, patch);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors.some((e) => e.type === 'cycle')).toBe(true);
  });
});

describe('GraphPatch diff (structural differ round-trips)', () => {
  test('diff(a, b) then apply(a, diff) deep-equals b', () => {
    const a1 = node('a');
    const a2 = node('b');
    const a = graph([a1, a2], [{ from: a1.id, to: a2.id, type: 'seq' }]);

    const b1 = node('a'); // kept
    const b3 = node('c'); // added
    const b = graph([b1, b3], [{ from: b1.id, to: b3.id, type: 'seq' }]);

    const patch = GraphPatch.diff(a, b);
    expect(patch.base).toBe(a.id);
    expect(patch.resultId).toBe(b.id);

    const reconstructed = GraphPatch.apply(a, patch);
    expect(reconstructed).toEqual(b);
    expect(reconstructed.id).toBe(b.id);
    expect(reconstructed.digest.integrity_digest).toBe(b.digest.integrity_digest);
  });

  test('diff of identical graphs is an empty op set that round-trips to the same id', () => {
    const a = graph([node('a'), node('b')], []);
    const patch = GraphPatch.diff(a, a);
    expect(patch.ops).toEqual([]);
    expect(GraphPatch.apply(a, patch).id).toBe(a.id);
  });
});

describe('GraphPatch receipt (composed onto the byte law)', () => {
  test('receipt produces an envelope subject-keyed to the patch result', async () => {
    const base = graph([node('a')], []);
    const patch = GraphPatch.propose(base, [{ op: 'add', family: 'signal', node: node('b') }]);

    const envelope = await GraphPatch.receipt(patch);
    expect(envelope.kind).toBe('graph-patch');
    expect(envelope.subject).toEqual({ type: 'artifact', id: patch.resultId });
    expect(envelope.hash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(envelope.previous).toBe('genesis');
    expect(envelope.payload.content_hash).toMatch(/^sha256:[0-9a-f]{64}$/);
  });
});
