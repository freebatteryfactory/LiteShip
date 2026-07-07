/**
 * Headless dual-export (F) — the JEWEL proven in node/CI, end to end.
 *
 * `dualExportNode(graph, ffmpegFrameEncoder())` runs the FULL dual-export proof
 * (one DocumentGraph → a static Astro page AND a video, both derived from one
 * source digest) AND drives a REAL ffmpeg byte-encode so a node caller gets a
 * genuine, ffprobe-validatable MP4 — not a browser-gated one.
 *
 * It asserts, headless:
 *  (a) a real non-empty MP4 `Uint8Array` (ISO-BMFF `ftyp` magic + ffprobe h264);
 *  (b) the dual-export INVARIANT still holds — `sharedSourceDigest === graph.digest`
 *      and both carriers read the SAME source, IDENTICAL to {@link dualExport};
 *  (c) the injected byte-encode does NOT change the proof's video FRAME digest
 *      (the encoder changes the BYTES, never WHAT the frames are).
 *
 * GATES on a real ffmpeg+libx264 probe (the CI-aligned helper). When ffmpeg is
 * absent it `test.skip`s with an explicit `console.warn` — never a silent pass,
 * never a fake "it encoded".
 *
 * @module
 */
import { describe, test, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { sealNode, sealGraph, AddressedDigest, CanonicalCbor, projectionKeys, HLC } from '@czap/core';
import type {
  DocumentGraph,
  ComponentNode,
  ProjectionNode,
  PoseNode,
  EntityNode,
  ContentAddress,
  CellMeta,
} from '@czap/core';
import { dualExport, dualExportNode, exportVideo } from '@czap/stage';
import { ffmpegFrameEncoder, ffmpegEncodeAvailable } from '@czap/stage/ffmpeg';
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

describe('headless dualExportNode (F) — the proof + a real MP4, in node', () => {
  if (!RUN) {
    test.skip('headless dual-export end to end (skipped — codec not on PATH)', () => {
      console.warn(
        '[stage/dual-export-node] SKIPPED: ffmpeg with libx264 is not available on PATH. ' +
          'The headless dual-export test cannot prove real MP4 bytes here. Install ffmpeg ' +
          '(CI: apt install ffmpeg on Ubuntu) to run it. This is an env-gated skip, NOT a pass.',
      );
    });
  } else {

  test('the stage probe agrees the codec is available', () => {
    expect(ffmpegEncodeAvailable()).toBe(true);
  });

  test('produces a real validatable MP4 Uint8Array (ftyp magic + ffprobe h264)', async () => {
    const graph = buildGraph();
    const result = await dualExportNode(graph, ffmpegFrameEncoder());

    // (a) Real bytes: a non-empty ISO-BMFF container the node caller can write out.
    expect(result.encoded.bytes).toBeInstanceOf(Uint8Array);
    expect(result.encoded.bytes.byteLength).toBeGreaterThan(0);
    expect(result.encoded.container).toBe('video/mp4');
    expect(result.encoded.codec).toBe('h264');
    expect(isIsoBmff(result.encoded.bytes)).toBe(true);

    // The encoded-bytes content address is a real sha256 digest.
    expect(result.bytesDigest.integrity_digest).toMatch(/^sha256:/);

    // ffprobe reads the bytes back as a genuine h264 video stream (exit 0).
    const probe = execFileSync(
      'ffprobe',
      ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name', '-of', 'default=nw=1:nk=1', '-'],
      { input: Buffer.from(result.encoded.bytes), encoding: 'utf8' },
    ).trim();
    expect(probe).toBe('h264');
  });

  test('the dual-export INVARIANT holds headless — sharedSourceDigest === graph.digest, one source for both casts', async () => {
    const graph = buildGraph();
    const projectionId = graph.nodes.find((n) => n.family === 'projection')!.id;
    const result = await dualExportNode(graph, ffmpegFrameEncoder());

    // (b) The single source both casts derive from IS the graph's own digest.
    expect(result.sharedSourceDigest.display_id).toBe(graph.digest.display_id);
    expect(result.sharedSourceDigest.integrity_digest).toBe(graph.digest.integrity_digest);

    // The page carrier and the video carrier read the SAME source projection —
    // exactly the proof the browser path makes, now proven headless.
    expect(result.astro.carrier).toBe('astro-page');
    expect(result.video.carrier).toBe('video');
    expect(result.astro.sourceRefs).toContain(projectionId);
    expect(result.video.sourceRefs).toContain(projectionId);
    expect([...result.astro.sourceRefs].sort()).toEqual([...result.video.sourceRefs].sort());

    // The parent merge head pins both child receipts (the single assertable head).
    const previous = result.receipt.previous as readonly string[];
    expect(previous).toContain(result.astroReceipt.hash);
    expect(previous).toContain(result.videoReceipt.hash);
  });

  test('the injected byte-encode does NOT change the proof video FRAME digest', async () => {
    const graph = buildGraph();
    // The frame-only video cast (no encoder) — the content address of the FRAMES.
    const frameOnly = exportVideo(graph);
    // The headless proof: its `video` carrier must be addressed over the SAME
    // frames, byte-for-byte identical to `dualExport`. The mp4 rides alongside in
    // `encoded`; it must not leak into the proof's frame digest.
    const proof = await dualExport(graph);
    const headless = await dualExportNode(graph, ffmpegFrameEncoder());

    expect(headless.video.artifactDigest.display_id).toBe(frameOnly.artifactDigest.display_id);
    expect(headless.video.artifactDigest.display_id).toBe(proof.video.artifactDigest.display_id);
    expect(headless.sharedSourceDigest.display_id).toBe(proof.sharedSourceDigest.display_id);

    // The real encoded bytes still exist and are non-trivial — the proof staying
    // frame-addressed does not mean the encode was skipped.
    expect(headless.encoded.bytes.byteLength).toBeGreaterThan(0);
  });
  }
});
