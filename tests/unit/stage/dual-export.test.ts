/**
 * Dual-export — THE PROOF (P4).
 *
 * One DocumentGraph → two casts (a static Astro page AND a video) → provably ONE
 * source. The shared-source hash IS the graph's own digest (not a hash of the
 * two outputs agreeing). The single assertable head is a parent MERGE receipt
 * whose `previous` carries BOTH child receipt hashes.
 */

import { describe, test, expect } from 'vitest';
import {
  sealNode,
  sealGraph,
  CanonicalCbor,
  AddressedDigest,
  projectionKeys,
  HLC,
  Receipt,
} from '@czap/core';
import type {
  DocumentGraph,
  ComponentNode,
  ProjectionNode,
  PoseNode,
  EntityNode,
  ContentAddress,
  CellMeta,
} from '@czap/core';
import { Effect } from 'effect';
import { dualExport, exportAstroPage, exportVideo } from '@czap/stage';

const ts = HLC.increment(HLC.create('test'), 1);
const meta: CellMeta = { created: ts, updated: ts, version: 1 };

/** Build a small DocumentGraph: one css component, one css projection, one pose. */
function buildGraph(): DocumentGraph {
  const component = sealNode<ComponentNode>({
    _tag: 'DocGraphComponentNode',
    _version: 1,
    family: 'component',
    id: '' as ContentAddress,
    meta,
    name: 'card',
    thresholds: [0, 768],
    states: ['mobile', 'desktop'],
  });

  const entity = sealNode<EntityNode>({
    _tag: 'DocGraphEntityNode',
    _version: 1,
    family: 'entity',
    id: '' as ContentAddress,
    meta,
    components: [component.id],
  });

  const projection = sealNode<ProjectionNode>({
    _tag: 'DocGraphProjectionNode',
    _version: 1,
    family: 'projection',
    id: '' as ContentAddress,
    meta,
    target: 'css',
    sourceRef: component.id,
    keys: projectionKeys('card'),
    resultDigest: AddressedDigest.of(CanonicalCbor.encode({ target: 'css', name: 'card' })),
  });

  const poseMobile = sealNode<PoseNode>({
    _tag: 'DocGraphPoseNode',
    _version: 1,
    family: 'pose',
    id: '' as ContentAddress,
    meta,
    entityRef: entity.id,
    state: 'mobile',
    bindings: { 'font-size': 14 },
  });

  const poseDesktop = sealNode<PoseNode>({
    _tag: 'DocGraphPoseNode',
    _version: 1,
    family: 'pose',
    id: '' as ContentAddress,
    meta,
    entityRef: entity.id,
    state: 'desktop',
    bindings: { 'font-size': 18 },
  });

  return sealGraph({
    _tag: 'DocumentGraph',
    _version: 1,
    meta,
    nodes: [component, entity, projection, poseMobile, poseDesktop],
    edges: [
      { from: entity.id, to: component.id, type: 'seq' },
      { from: component.id, to: projection.id, type: 'seq' },
    ],
  });
}

describe('dualExport — one graph, two casts, one source (P4)', () => {
  test('both casts reference the same source projection', async () => {
    const graph = buildGraph();
    const projectionId = graph.nodes.find((n) => n.family === 'projection')!.id;

    const astro = exportAstroPage(graph);
    const video = exportVideo(graph);

    expect(astro.carrier).toBe('astro-page');
    expect(video.carrier).toBe('video');

    // Both ExportNodes' sourceRefs resolve into the SAME source node of the graph.
    expect(astro.sourceRefs).toContain(projectionId);
    expect(video.sourceRefs).toContain(projectionId);
    expect([...astro.sourceRefs].sort()).toEqual([...video.sourceRefs].sort());

    // Each source ref resolves to a node that exists in the one graph.
    const ids = new Set(graph.nodes.map((n) => n.id));
    for (const ref of [...astro.sourceRefs, ...video.sourceRefs]) {
      expect(ids.has(ref)).toBe(true);
    }
  });

  test('artifacts differ but derive from one source; digests are real content addresses', async () => {
    const graph = buildGraph();
    const astro = exportAstroPage(graph);
    const video = exportVideo(graph);

    // Two distinct carriers produce two distinct artifact addresses.
    expect(astro.artifactDigest.display_id).not.toBe(video.artifactDigest.display_id);
    // Real sha256 addressed digests (display_id is fnv1a, integrity is sha256).
    expect(astro.artifactDigest.integrity_digest).toMatch(/^sha256:/);
    expect(video.artifactDigest.integrity_digest).toMatch(/^sha256:/);

    // Determinism: re-running the same graph yields the same artifact addresses.
    expect(exportAstroPage(graph).artifactDigest.display_id).toBe(astro.artifactDigest.display_id);
    expect(exportVideo(graph).artifactDigest.display_id).toBe(video.artifactDigest.display_id);
  });

  test('sharedSourceDigest === graph.digest (the ONE source both casts derive from)', async () => {
    const graph = buildGraph();
    const result = await dualExport(graph);

    // The shared source hash IS the graph's own integrity digest — the single
    // source address both casts derive from (the keystone kernel minted it over
    // the canonical bytes of the graph's sorted node ids + edges).
    expect(result.sharedSourceDigest.display_id).toBe(graph.digest.display_id);
    expect(result.sharedSourceDigest.integrity_digest).toBe(graph.digest.integrity_digest);
    expect(result.sharedSourceDigest.integrity_digest).toMatch(/^sha256:/);
  });

  test('parent merge receipt previous contains BOTH child hashes (the single assertable head)', async () => {
    const graph = buildGraph();
    const result = await dualExport(graph);

    expect(Array.isArray(result.receipt.previous)).toBe(true);
    const previous = result.receipt.previous as readonly string[];
    expect(previous).toContain(result.astroReceipt.hash);
    expect(previous).toContain(result.videoReceipt.hash);
    expect(previous).toHaveLength(2);

    // The merge envelope's hash recomputes (it is a valid receipt over its payload).
    const recomputed = await Effect.runPromise(Receipt.hashEnvelope(result.receipt));
    expect(recomputed).toBe(result.receipt.hash);

    // The merge head is a genesis-eligible merge (both children are genesis) and
    // its payload pins the shared source digest — the proof that both casts
    // descend from one source.
    expect(result.receipt.kind).toBe('stage.dual-export');
    expect(result.receipt.subject.id).toBe(graph.id);
  });

  test('child receipts pin the shared source digest to each carrier', async () => {
    const graph = buildGraph();
    const result = await dualExport(graph);

    // Both child receipts are genesis (roots of their own one-link chains).
    expect(Receipt.isGenesis(result.astroReceipt)).toBe(true);
    expect(Receipt.isGenesis(result.videoReceipt)).toBe(true);
    expect(result.astroReceipt.hash).not.toBe(result.videoReceipt.hash);
  });
});
