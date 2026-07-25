/** Public Stage -> injected encoder -> Remotion projection recovery proof. */

import { describe, expect, test } from 'vitest';
import {
  AddressedDigest,
  CanonicalCbor,
  HLC,
  Receipt,
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
import { exportVideoEncoded, type EncodedVideo, type FrameEncoder } from '@liteship/stage';
import { cssVarsFromState } from '@liteship/remotion';
import { createCurePacket } from '../../packages/cli/src/lib/cure-packet.js';

const timestamp = HLC.increment(HLC.create('stage-remotion-recovery'), 1);
const meta: CellMeta = { created: timestamp, updated: timestamp, version: 1 };

function renderGraph(mobileOpacity = 0.25, desktopOpacity = 1): DocumentGraph {
  const component = sealNode<ComponentNode>({
    _tag: 'DocGraphComponentNode',
    _version: 1,
    family: 'component',
    id: '' as ContentAddress,
    meta,
    name: 'hero',
    thresholds: [0, 960],
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
    keys: projectionKeys('hero'),
    resultDigest: AddressedDigest.of(CanonicalCbor.encode({ target: 'css', name: 'hero' })),
  });
  const pose = (state: 'mobile' | 'desktop', opacity: number): PoseNode =>
    sealNode<PoseNode>({
      _tag: 'DocGraphPoseNode',
      _version: 1,
      family: 'pose',
      id: '' as ContentAddress,
      meta,
      entityRef: entity.id,
      state,
      bindings: { opacity },
    });
  return sealGraph({
    _tag: 'DocumentGraph',
    _version: 1,
    meta,
    nodes: [component, entity, projection, pose('mobile', mobileOpacity), pose('desktop', desktopOpacity)],
    edges: [
      { from: entity.id, to: component.id, type: 'seq' },
      { from: component.id, to: projection.id, type: 'seq' },
    ],
  });
}

function encodedFixture(frames: readonly CompositeState[]): EncodedVideo {
  return {
    bytes: CanonicalCbor.encode(
      frames.map((frame) => ({ discrete: frame.discrete, css: cssVarsFromState(frame) })),
    ),
    codec: 'fixture/raw-cbor',
    container: 'application/cbor',
  };
}

describe('Stage + Remotion encoded-render recovery', () => {
  test('authored pose state reaches the injected encoder and the encoded receipt identifies that artifact', async () => {
    const graph = renderGraph();
    let observed: readonly CompositeState[] = [];
    const result = await exportVideoEncoded(graph, async (frames, config) => {
      observed = frames;
      expect(Object.isFrozen(frames)).toBe(true);
      expect(Object.isFrozen(frames[0]?.outputs.css)).toBe(true);
      expect(Object.isFrozen(config)).toBe(true);
      expect(() => {
        (frames[0]!.outputs.css as Record<string, number | string>)['--opacity'] = 99;
      }).toThrow(TypeError);
      return encodedFixture(frames);
    });

    expect(observed).toHaveLength(4);
    expect(cssVarsFromState(observed[0]!)).toMatchObject({ '--opacity': '0.25' });
    expect(cssVarsFromState(observed.at(-1)!)).toMatchObject({ '--opacity': '1' });
    expect(result.receipt).toMatchObject({
      kind: 'stage.export.video.encoded',
      subject: { type: 'artifact', id: result.node.id },
      previous: Receipt.GENESIS,
    });
    expect(await Receipt.hashEnvelope(result.receipt)).toBe(result.receipt.hash);
    expect(result.bytesDigest).toEqual(AddressedDigest.of(result.encoded.bytes));
  });

  test('a deterministic encoder fault mints one replayable CurePacket and recovery converges to the clean receipt', async () => {
    const graph = renderGraph();
    let attempts = 0;
    const encoder: FrameEncoder = async (frames) => {
      attempts += 1;
      if (attempts === 1) throw new Error('ENCODER_FAULT seed=stage-1808 attempt=1');
      return encodedFixture(frames);
    };

    let failure = '';
    try {
      await exportVideoEncoded(graph, encoder);
    } catch (error) {
      failure = error instanceof Error ? error.message : String(error);
    }
    expect(failure).toBe('ENCODER_FAULT seed=stage-1808 attempt=1');

    const packetInput = {
      headSha: 'stage-remotion-fixture-head',
      treeDigest: graph.digest.integrity_digest,
      checkId: 'check/stage-remotion-encode',
      title: 'Stage encoded render must be replayable',
      claim: 'The same addressed graph and encoder input produce one valid encoded receipt.',
      owner: 'packages/stage',
      remediation: 'Replay the exact graph through the injected encoder and compare the encoded receipt.',
      command: 'pnpm exec vitest run tests/integration/stage-remotion-encode-recovery.test.ts',
      findings: [failure],
      profile: 'full',
      lane: 'integration:stage-remotion',
      platform: 'fixture',
      toolchain: 'node=fixture',
      invariantIds: ['INV-STAGE-ENCODED-RECEIPT'],
      publicRoutes: ['@liteship/stage#exportVideoEncoded', '@liteship/remotion#cssVarsFromState'],
      artifacts: [{ path: 'document-graph', digest: graph.digest.integrity_digest }],
      reproducer: {
        kind: 'schedule' as const,
        seed: 'stage-1808',
        fixture: graph.id,
        schedule: [{ attempt: 1, point: 'frame-encoder', action: 'reject' }],
      },
    };
    const packet = createCurePacket(packetInput);
    const samePacket = createCurePacket(packetInput);
    expect(samePacket.packetId).toBe(packet.packetId);
    expect(packet.prompt).toContain('Seed: stage-1808');
    expect(packet.prompt).toContain(graph.id);
    expect(Object.isFrozen(packet)).toBe(true);

    const recovered = await exportVideoEncoded(graph, encoder);
    const clean = await exportVideoEncoded(graph, async (frames) => encodedFixture(frames));

    expect(attempts).toBe(2);
    expect(recovered.bytesDigest).toEqual(clean.bytesDigest);
    expect(recovered.node.id).toBe(clean.node.id);
    expect(recovered.receipt.hash).toBe(clean.receipt.hash);
    expect(await Receipt.hashEnvelope(recovered.receipt)).toBe(recovered.receipt.hash);
  });
});
