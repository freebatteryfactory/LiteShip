/** Cross-carrier source-identity properties for the public Stage orchestration. */

import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import {
  AddressedDigest,
  CanonicalCbor,
  HLC,
  projectionKeys,
  sealGraph,
  sealNode,
  type CellMeta,
  type ComponentNode,
  type CompositeState,
  type ContentAddress,
  type DocumentGraph,
  type EntityNode,
  type PoseNode,
  type ProjectionNode,
} from '@liteship/core';
import { dualExport, exportAstroPage, exportVideo, exportVideoEncoded } from '@liteship/stage';
import { cssVarsFromState } from '@liteship/remotion';

const timestamp = HLC.increment(HLC.create('stage-property'), 1);
const meta: CellMeta = { created: timestamp, updated: timestamp, version: 1 };

function graphFor(threshold: number, mobileSize: number, desktopSize: number): DocumentGraph {
  const component = sealNode<ComponentNode>({
    _tag: 'DocGraphComponentNode',
    _version: 1,
    family: 'component',
    id: '' as ContentAddress,
    meta,
    name: 'card',
    thresholds: [0, threshold],
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
  const pose = (state: 'mobile' | 'desktop', size: number): PoseNode =>
    sealNode<PoseNode>({
      _tag: 'DocGraphPoseNode',
      _version: 1,
      family: 'pose',
      id: '' as ContentAddress,
      meta,
      entityRef: entity.id,
      state,
      bindings: { 'font-size': size },
    });
  return sealGraph({
    _tag: 'DocumentGraph',
    _version: 1,
    meta,
    nodes: [component, entity, projection, pose('mobile', mobileSize), pose('desktop', desktopSize)],
    edges: [
      { from: entity.id, to: component.id, type: 'seq' },
      { from: component.id, to: projection.id, type: 'seq' },
    ],
  });
}

describe('@liteship/stage cross-carrier contract', () => {
  test('both carriers deterministically retain the same real source projection', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 4096 }),
        fc.integer({ min: 1, max: 256 }),
        fc.integer({ min: 1, max: 256 }),
        (threshold, mobileSize, desktopSize) => {
          const graph = graphFor(threshold, mobileSize, desktopSize);
          const projection = graph.nodes.find((node) => node.family === 'projection')!;
          const astro = exportAstroPage(graph);
          const video = exportVideo(graph);

          expect(astro.sourceRefs).toEqual([projection.id]);
          expect(video.sourceRefs).toEqual([projection.id]);
          expect(exportAstroPage(graph).artifactDigest).toEqual(astro.artifactDigest);
          expect(exportVideo(graph).artifactDigest).toEqual(video.artifactDigest);
          expect(astro.artifactDigest.integrity_digest).toMatch(/^sha256:[0-9a-f]{64}$/u);
          expect(video.artifactDigest.integrity_digest).toMatch(/^sha256:[0-9a-f]{64}$/u);
        },
      ),
      { seed: 0x5eed_1804, numRuns: 120 },
    );
  });

  test('the merge receipt binds both child casts to the exact graph digest', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 4096 }),
        fc.integer({ min: 1, max: 256 }),
        fc.integer({ min: 1, max: 256 }),
        async (threshold, mobileSize, desktopSize) => {
          const graph = graphFor(threshold, mobileSize, desktopSize);
          const result = await dualExport(graph);

          expect(result.sharedSourceDigest).toBe(graph.digest);
          expect(result.astro.sourceRefs).toEqual(result.video.sourceRefs);
          expect(result.receipt.previous).toHaveLength(2);
          expect(new Set(result.receipt.previous).size).toBe(2);
        },
      ),
      { seed: 0x5eed_1805, numRuns: 80 },
    );
  });

  test('changing authored pose bytes changes both carrier evidence while preserving source agreement', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 4096 }), fc.integer({ min: 1, max: 255 }), (threshold, size) => {
        const left = graphFor(threshold, size, size + 1);
        const right = graphFor(threshold, size, size + 2);

        expect(left.digest).not.toBe(right.digest);
        expect(exportAstroPage(left).artifactDigest.integrity_digest).not.toBe(
          exportAstroPage(right).artifactDigest.integrity_digest,
        );
        expect(exportVideo(left).artifactDigest.integrity_digest).not.toBe(
          exportVideo(right).artifactDigest.integrity_digest,
        );
      }),
      { seed: 0x5eed_1806, numRuns: 80 },
    );
  });

  test('encoded frames and their receipt retain authored poses through the public Remotion projection', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 4096 }),
        fc.integer({ min: 1, max: 255 }),
        async (threshold, mobileSize) => {
          const desktopSize = mobileSize + 1;
          const graph = graphFor(threshold, mobileSize, desktopSize);
          let observedFrames: readonly CompositeState[] = [];
          const result = await exportVideoEncoded(graph, async (frames) => {
            observedFrames = frames;
            return {
              bytes: CanonicalCbor.encode(frames.map((frame) => frame.outputs.css)),
              codec: 'fixture/raw-cbor',
              container: 'application/cbor',
            };
          });

          expect(observedFrames).toHaveLength(4);
          expect(cssVarsFromState(observedFrames[0]!)['--font-size']).toBe(String(mobileSize));
          expect(cssVarsFromState(observedFrames.at(-1)!)['--font-size']).toBe(String(desktopSize));
          expect(result.receipt.kind).toBe('stage.export.video.encoded');
          expect(result.receipt.subject.id).toBe(result.node.id);
          expect(result.receipt.previous).toBe('genesis');

          const changed = await exportVideoEncoded(graphFor(threshold, mobileSize, desktopSize + 1), async (frames) => ({
            bytes: CanonicalCbor.encode(frames.map((frame) => frame.outputs.css)),
            codec: 'fixture/raw-cbor',
            container: 'application/cbor',
          }));
          expect(changed.bytesDigest).not.toEqual(result.bytesDigest);
          expect(changed.receipt.hash).not.toBe(result.receipt.hash);
        },
      ),
      { seed: 0x5eed_1807, numRuns: 40 },
    );
  });
});
