/**
 * Headless ffmpeg encoder (B) — the byte-encode seam made REAL.
 *
 * `exportVideoEncoded(graph, ffmpegFrameEncoder())` produces a genuine,
 * validatable MP4: we assert the bytes are an ISO-BMFF container (the `ftyp`
 * box magic) AND that `ffprobe` reads it back as an h264 video stream. The
 * node ffmpeg adapter is the headless backend of the SAME `FrameEncoder` seam
 * the browser WebCodecs path implements.
 *
 * This test GATES on a real ffmpeg+libx264 probe (the CI-aligned helper). When
 * ffmpeg is absent it `test.skip`s with an explicit `console.warn` — never a
 * silent pass, never a fake "it encoded".
 *
 * @module
 */
import { describe, test, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import {
  sealNode,
  sealGraph,
  AddressedDigest,
  CanonicalCbor,
  projectionKeys,
  HLC,
} from '@liteship/core';
import type {
  DocumentGraph,
  ComponentNode,
  ProjectionNode,
  PoseNode,
  EntityNode,
  ContentAddress,
  CellMeta,
} from '@liteship/core';
import { exportVideo, exportVideoEncoded } from '@liteship/stage';
import { ffmpegFrameEncoder, ffmpegEncodeAvailable } from '@liteship/stage/ffmpeg';
import { FFMPEG_RENDER_CAPABLE } from '../../helpers/ffmpeg.js';

const ts = HLC.increment(HLC.create('test'), 1);
const meta: CellMeta = { created: ts, updated: ts, version: 1 };

/** A small DocumentGraph: one css component, one css projection, two poses. */
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

/** ISO-BMFF: bytes 4..8 of an mp4 are the `ftyp` box type. */
function isIsoBmff(bytes: Uint8Array): boolean {
  return (
    bytes.length > 12 &&
    bytes[4] === 0x66 && // f
    bytes[5] === 0x74 && // t
    bytes[6] === 0x79 && // y
    bytes[7] === 0x70 //   p
  );
}

const RUN = FFMPEG_RENDER_CAPABLE;

describe('headless ffmpeg encoder (B) — real bytes behind the encode seam', () => {
  if (!RUN) {
    test.skip('ffmpeg+libx264 encode (skipped — codec not on PATH)', () => {
      console.warn(
        '[stage/ffmpeg-encoder] SKIPPED: ffmpeg with libx264 is not available on PATH. ' +
          'The headless encode test cannot prove real MP4 bytes here. Install ffmpeg ' +
          '(CI: apt install ffmpeg on Ubuntu) to run it. This is an env-gated skip, NOT a pass.',
      );
    });
  } else {

  test('the stage probe agrees the codec is available', () => {
    expect(ffmpegEncodeAvailable()).toBe(true);
  });

  test('exportVideoEncoded produces a validatable MP4 (ftyp magic + ffprobe h264)', async () => {
    const graph = buildGraph();
    const { node, encoded, bytesDigest } = await exportVideoEncoded(graph, ffmpegFrameEncoder());

    // Real bytes: a non-empty ISO-BMFF container.
    expect(encoded.bytes.byteLength).toBeGreaterThan(0);
    expect(encoded.container).toBe('video/mp4');
    expect(isIsoBmff(encoded.bytes)).toBe(true);

    // The export node is a content address OF the encoded bytes, not only frames.
    expect(node.carrier).toBe('video');
    expect(bytesDigest.integrity_digest).toMatch(/^sha256:/);
    expect(node.artifactDigest.integrity_digest).toMatch(/^sha256:/);

    // ffprobe reads the bytes back as a real h264 video stream.
    const probe = execFileSync(
      'ffprobe',
      ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name', '-of', 'default=nw=1:nk=1', '-'],
      { input: Buffer.from(encoded.bytes), encoding: 'utf8' },
    ).trim();
    expect(probe).toBe('h264');
  });

  test('the encoded digest differs from the frame-only digest (bytes are folded in)', async () => {
    const graph = buildGraph();
    const frameOnly = exportVideo(graph);
    const { node } = await exportVideoEncoded(graph, ffmpegFrameEncoder());

    // Pinning the real byte digest changes the artifact address — the encoded
    // node addresses the BYTES, the plain cast addresses only the frames.
    expect(node.artifactDigest.display_id).not.toBe(frameOnly.artifactDigest.display_id);

    // Same source refs either way — both casts read the same projection.
    expect([...node.sourceRefs].sort()).toEqual([...frameOnly.sourceRefs].sort());
  });
  }
});
