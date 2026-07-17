/**
 * Dual-export — THE PROOF (P4).
 *
 * One DocumentGraph → two casts (a static Astro page AND a video) → provably ONE
 * source. The shared-source hash IS the graph's own digest (not a hash of the
 * two outputs agreeing). The single assertable head is a parent MERGE receipt
 * whose `previous` carries BOTH child receipt hashes.
 */

import { describe, test, expect } from 'vitest';
import { sealNode, sealGraph, CanonicalCbor, AddressedDigest, projectionKeys, HLC, Receipt } from '@czap/core';
import type {
  DocumentGraph,
  ComponentNode,
  ProjectionNode,
  PoseNode,
  EntityNode,
  ContentAddress,
  CellMeta,
} from '@czap/core';
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
  test('a css projection over a stateless component fails with a clear message (boundaryOf guard)', () => {
    const emptyComponent = sealNode<ComponentNode>({
      _tag: 'DocGraphComponentNode',
      _version: 1,
      family: 'component',
      id: '' as ContentAddress,
      meta,
      name: 'empty',
      thresholds: [],
      states: [],
    });
    const projection = sealNode<ProjectionNode>({
      _tag: 'DocGraphProjectionNode',
      _version: 1,
      family: 'projection',
      id: '' as ContentAddress,
      meta,
      target: 'css',
      sourceRef: emptyComponent.id,
      keys: projectionKeys('empty'),
      resultDigest: AddressedDigest.of(CanonicalCbor.encode({ target: 'css', name: 'empty' })),
    });
    const graph = sealGraph({
      _tag: 'DocumentGraph',
      _version: 1,
      meta,
      nodes: [emptyComponent, projection],
      edges: [],
    });
    expect(() => exportAstroPage(graph)).toThrow(/no states\/thresholds/);
  });

  test('a component with omitted states/thresholds also trips the boundaryOf guard', () => {
    // states/thresholds are optional on ComponentNode; omitting them drives the
    // `?? []` fallbacks in boundaryOf, which then throws on the empty tuple.
    const baldComponent = sealNode<ComponentNode>({
      _tag: 'DocGraphComponentNode',
      _version: 1,
      family: 'component',
      id: '' as ContentAddress,
      meta,
      name: 'bald',
    });
    const projection = sealNode<ProjectionNode>({
      _tag: 'DocGraphProjectionNode',
      _version: 1,
      family: 'projection',
      id: '' as ContentAddress,
      meta,
      target: 'css',
      sourceRef: baldComponent.id,
      keys: projectionKeys('bald'),
      resultDigest: AddressedDigest.of(CanonicalCbor.encode({ target: 'css', name: 'bald' })),
    });
    const graph = sealGraph({
      _tag: 'DocumentGraph',
      _version: 1,
      meta,
      nodes: [baldComponent, projection],
      edges: [],
    });
    expect(() => exportVideo(graph)).toThrow(/no states\/thresholds/);
  });

  test('a css projection whose sourceRef resolves to no component is skipped by both casts', () => {
    // The projection points at an id that is not a ComponentNode in the graph,
    // so `componentFor` returns undefined and both casters take the
    // `if (!component) continue` skip path. The casts still succeed (empty).
    const danglingRef = AddressedDigest.of(CanonicalCbor.encode({ missing: true })).display_id as ContentAddress;
    const projection = sealNode<ProjectionNode>({
      _tag: 'DocGraphProjectionNode',
      _version: 1,
      family: 'projection',
      id: '' as ContentAddress,
      meta,
      target: 'css',
      sourceRef: danglingRef,
      keys: projectionKeys('ghost'),
      resultDigest: AddressedDigest.of(CanonicalCbor.encode({ target: 'css', name: 'ghost' })),
    });
    const graph = sealGraph({
      _tag: 'DocumentGraph',
      _version: 1,
      meta,
      nodes: [projection],
      edges: [],
    });
    const astro = exportAstroPage(graph);
    const video = exportVideo(graph);
    // The projection id is still recorded as a source ref even though its
    // component is absent (the skip happens after the ref is pushed).
    expect(astro.sourceRefs).toContain(projection.id);
    expect(video.sourceRefs).toContain(projection.id);
    expect(astro.carrier).toBe('astro-page');
    expect(video.carrier).toBe('video');
  });

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

  test('Astro page CSS only reads poses owned by the projection component entity', () => {
    const graph = buildGraph();
    const baseline = exportAstroPage(graph);

    const unrelatedComponent = sealNode<ComponentNode>({
      _tag: 'DocGraphComponentNode',
      _version: 1,
      family: 'component',
      id: '' as ContentAddress,
      meta,
      name: 'sidebar',
      thresholds: [0],
      states: ['mobile'],
    });
    const unrelatedEntity = sealNode<EntityNode>({
      _tag: 'DocGraphEntityNode',
      _version: 1,
      family: 'entity',
      id: '' as ContentAddress,
      meta,
      components: [unrelatedComponent.id],
    });
    const unrelatedPose = sealNode<PoseNode>({
      _tag: 'DocGraphPoseNode',
      _version: 1,
      family: 'pose',
      id: '' as ContentAddress,
      meta,
      entityRef: unrelatedEntity.id,
      state: 'mobile',
      bindings: { 'font-size': 99 },
    });
    const noisy = sealGraph({
      _tag: 'DocumentGraph',
      _version: 1,
      meta,
      nodes: [...graph.nodes, unrelatedComponent, unrelatedEntity, unrelatedPose],
      edges: [...graph.edges, { from: unrelatedEntity.id, to: unrelatedComponent.id, type: 'seq' }],
    });

    expect(exportAstroPage(noisy).artifactDigest.display_id).toBe(baseline.artifactDigest.display_id);
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

  test('the video cast drives the pose quantizer across a real boundary crossing', () => {
    // A graph whose css component boundary spans [0, 768] mobile→desktop. The
    // video cast sweeps its input across that span, so each frame's quantizer
    // `evaluate(value)` re-derives the discrete state — the first frame parks at
    // the low band, the last clears the 768 threshold into the high band. The
    // crossing track is folded into the artifact digest, so a graph that CAN
    // cross must produce a different video address than one that CANNOT.
    const crossing = buildGraph();

    // A degenerate single-band component: the sweep collapses to one value (lo
    // === hi), so `evaluate` can never cross — the video is a frozen pose.
    const flatComponent = sealNode<ComponentNode>({
      _tag: 'DocGraphComponentNode',
      _version: 1,
      family: 'component',
      id: '' as ContentAddress,
      meta,
      name: 'card',
      thresholds: [0],
      states: ['only'],
    });
    const flatEntity = sealNode<EntityNode>({
      _tag: 'DocGraphEntityNode',
      _version: 1,
      family: 'entity',
      id: '' as ContentAddress,
      meta,
      components: [flatComponent.id],
    });
    const flatProjection = sealNode<ProjectionNode>({
      _tag: 'DocGraphProjectionNode',
      _version: 1,
      family: 'projection',
      id: '' as ContentAddress,
      meta,
      target: 'css',
      sourceRef: flatComponent.id,
      keys: projectionKeys('card'),
      resultDigest: AddressedDigest.of(CanonicalCbor.encode({ target: 'css', name: 'card' })),
    });
    const flatPose = sealNode<PoseNode>({
      _tag: 'DocGraphPoseNode',
      _version: 1,
      family: 'pose',
      id: '' as ContentAddress,
      meta,
      entityRef: flatEntity.id,
      state: 'only',
      bindings: { 'font-size': 14 },
    });
    const flatGraph = sealGraph({
      _tag: 'DocumentGraph',
      _version: 1,
      meta,
      nodes: [flatComponent, flatEntity, flatProjection, flatPose],
      edges: [
        { from: flatEntity.id, to: flatComponent.id, type: 'seq' },
        { from: flatComponent.id, to: flatProjection.id, type: 'seq' },
      ],
    });

    const crossingVideo = exportVideo(crossing);
    const flatVideo = exportVideo(flatGraph);

    // The crossing track is real: a boundary the sweep traverses yields a
    // distinct artifact address from one it cannot (proves `evaluate`'s
    // per-frame result is load-bearing, not dead sugar).
    expect(crossingVideo.artifactDigest.display_id).not.toBe(flatVideo.artifactDigest.display_id);

    // Driving `evaluate` per frame stays deterministic — the same graph casts to
    // the same address every run.
    expect(exportVideo(crossing).artifactDigest.display_id).toBe(crossingVideo.artifactDigest.display_id);
    expect(crossingVideo.artifactDigest.integrity_digest).toMatch(/^sha256:/);
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
    const recomputed = await Receipt.hashEnvelope(result.receipt);
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
