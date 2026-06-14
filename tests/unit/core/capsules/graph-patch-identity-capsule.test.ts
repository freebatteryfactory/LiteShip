/**
 * graph-patch-identity capsule (F) — direct unit assertions over the capsule's
 * declaration and its seed→graph builder. The generated property test
 * (`tests/generated/core-graph-patch-identity.test.ts`) drives the invariants
 * under random seeds; this file pins the declaration shape and the ONE subtle
 * property that shaped the capsule's equality check: a round-trip preserves
 * graph IDENTITY (a content-addressed multiset), NOT authoring array order.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { graphPatchIdentityCapsule, GraphPatch } from '@czap/core';
import { _graphPatchIdentityInternals } from '../../../../packages/core/src/capsules/graph-patch-identity.js';

const { buildGraph, sameGraph, signalNode } = _graphPatchIdentityInternals;

describe('graphPatchIdentityCapsule (declaration)', () => {
  it('declares a pureTransform capsule with a content-addressed id', () => {
    expect(graphPatchIdentityCapsule._kind).toBe('pureTransform');
    expect(graphPatchIdentityCapsule.name).toBe('core.graph-patch-identity');
    expect(graphPatchIdentityCapsule.id).toMatch(/^fnv1a:/);
  });

  it('declares the three round-trip invariants, each with a name + message + check', () => {
    const names = graphPatchIdentityCapsule.invariants.map((i) => i.name);
    expect(names).toEqual(['diff-apply-round-trip', 'patch-validates', 'result-id-consistency']);
    for (const inv of graphPatchIdentityCapsule.invariants) {
      expect(inv.name).toBeTruthy();
      expect(inv.message).toBeTruthy();
      expect(typeof inv.check).toBe('function');
    }
  });
});

describe('graph-patch-identity seed→graph builder', () => {
  it('seals distinct axis names into distinct content-addressed nodes (and dedups repeats)', () => {
    const g = buildGraph({ inputs: ['x', 'y', 'x'], edges: [] });
    expect(g.id).toMatch(/^fnv1a:/);
    // Three inputs, one a repeat → two distinct sealed nodes.
    expect(g.nodes).toHaveLength(2);
    for (const node of g.nodes) expect(node.id).toMatch(/^fnv1a:/);
  });

  it('normalizes edge index pairs to an acyclic, in-range, self-loop-free edge set', () => {
    // Out-of-range and reversed indices are normalized to min→max over the node
    // list, so every endpoint exists and the graph stays acyclic.
    const g = buildGraph({ inputs: ['a', 'b', 'c'], edges: [[2, 0], [0, 0], [9, 1]] });
    // [2,0] → 0→2 ; [0,0] dropped (self-loop) ; [9,1] → 1%3=1, 9%3=0 → 0→1.
    expect(GraphPatch.validate(g, { _tag: 'GraphPatch', _version: 1, base: g.id, ops: [] }).ok).toBe(true);
    expect(g.edges.length).toBeGreaterThan(0);
    for (const e of g.edges) expect(e.from).not.toBe(e.to);
  });
});

describe('sameGraph — canonical (order-independent) round-trip equality', () => {
  it('treats two authoring-orders of the same nodes as the SAME graph', () => {
    // The round-trip subtlety: `apply` rebuilds nodes in kept-then-added order,
    // which need not match `b`'s authoring order even when they are one graph.
    const a = signalNode('a');
    const b = signalNode('b');
    const g1 = buildGraph({ inputs: ['a', 'b'], edges: [] });
    const g2 = buildGraph({ inputs: ['b', 'a'], edges: [] });
    // Sanity: the two were authored in opposite order...
    expect(g1.nodes[0]?.id).toBe(a.id);
    expect(g2.nodes[0]?.id).toBe(b.id);
    // ...yet they are the SAME content-addressed graph.
    expect(g1.id).toBe(g2.id);
    expect(sameGraph(g1, g2)).toBe(true);
  });

  it('distinguishes graphs that differ in their node multiset', () => {
    const g1 = buildGraph({ inputs: ['a', 'b'], edges: [] });
    const g2 = buildGraph({ inputs: ['a', 'c'], edges: [] });
    expect(sameGraph(g1, g2)).toBe(false);
  });

  it('the real round-trip holds: apply(a, diff(a, b)) is the same graph as b', () => {
    const a = buildGraph({ inputs: ['a', 'b'], edges: [[0, 1]] });
    const b = buildGraph({ inputs: ['a', 'c'], edges: [[0, 1]] });
    const patch = GraphPatch.diff(a, b);
    const result = GraphPatch.apply(a, patch);
    expect(sameGraph(result, b)).toBe(true);
    expect(patch.resultId).toBe(b.id);
    expect(result.id).toBe(b.id);
  });
});
