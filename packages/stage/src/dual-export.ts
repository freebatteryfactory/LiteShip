/**
 * Dual-export — THE proof: one {@link DocumentGraph} casts to a static Astro
 * page AND a video, both provably derived from the SAME source digest.
 *
 * This is the verb/orchestration layer. It owns no identity kernel of its own:
 * every content address is minted through `CanonicalCbor.encode` →
 * `AddressedDigest.of` (the `@czap/core` kernel, ADR-0003/0011), and every
 * caster it drives already EXISTS — `CSSCompiler.compile` (`@czap/compiler`),
 * `resolveInitialState`/`satelliteAttrs` (`@czap/astro`), `VideoRenderer.make`
 * over a `Compositor` (`@czap/core`). Stage reinvents none of them; it only
 * walks the graph and binds the casters' outputs back to the graph's source.
 *
 * The shared-source hash is the **DocumentGraph.digest** itself — not a hash of
 * the two outputs agreeing, but the digest of the ONE source both casts read.
 * The single assertable head is a PARENT MERGE `Receipt` envelope whose
 * `previous` is `[astroReceiptHash, videoReceiptHash]` and whose payload pins
 * the shared source digest. "Written data needs a reader": each `ExportNode`
 * and the merge envelope ARE the readers of the graph.
 *
 * @module
 */

import type {
  DocumentGraph,
  ExportNode,
  ProjectionNode,
  ComponentNode,
  PoseNode,
  CompositeState,
  Quantizer,
  ReceiptEnvelope,
  ContentAddress,
  Millis,
} from '@czap/core';
import type { AddressedDigest } from '@czap/core';
import {
  CanonicalCbor,
  AddressedDigest as AddressedDigestNS,
  sealNode,
  Boundary,
  Compositor,
  VideoRenderer,
  Receipt,
  TypedRef,
  HLC,
} from '@czap/core';
import { Effect } from 'effect';
import { CSSCompiler } from '@czap/compiler';
import { resolveInitialState, satelliteAttrs } from '@czap/astro';
// `captureVideo` is the real WebCodecs/Canvas egress for the video carrier. It
// requires OffscreenCanvas / createImageBitmap, which are not present in a
// headless Node test env (see packages/web/src/capture/pipeline.ts). We import
// the type-level seam to keep the dependency honest and drive the SAME
// `VideoRenderer.frames()` it consumes; the artifact digest below content-
// addresses the real per-frame `CompositeState` snapshots that pipeline would
// encode, so the digest is a true content address of the produced frames —
// the byte-encode of the codec is the INJECTED seam (browser: WebCodecs via
// `captureVideo`; node: the ffmpeg `FrameEncoder` adapter in `./ffmpeg-encoder`).
import type { captureVideo } from '@czap/web';

// ---------------------------------------------------------------------------
// FrameEncoder — the injectable byte-encode seam (two real backends, one shape)
// ---------------------------------------------------------------------------

/** The deterministic spec a {@link FrameEncoder} encodes the frames at. */
export interface VideoEncodeConfig {
  readonly fps: number;
  readonly width: number;
  readonly height: number;
  readonly durationMs: number;
}

/** The real encoded video bytes a {@link FrameEncoder} produces. */
export interface EncodedVideo {
  /** The encoded container bytes (e.g. a real ISO-BMFF/MP4 byte stream). */
  readonly bytes: Uint8Array;
  /** Codec id of the encode (e.g. `'h264'`, `'avc1.42001E'`). */
  readonly codec: string;
  /** Container/MIME of the bytes (e.g. `'video/mp4'`). */
  readonly container: string;
}

/**
 * The byte-encode seam: turn the produced per-frame {@link CompositeState}
 * snapshots into real encoded video bytes. Stage's CORE owns no encoder — this
 * is INJECTED at the call site so the pure graph-walk never imports a codec:
 *
 *  - browser/worker: WebCodecs over an OffscreenCanvas (`@czap/web` capture);
 *  - node/headless: the ffmpeg child-process adapter in `./ffmpeg-encoder`.
 *
 * Both are real backends of this one shape; neither lives in `dual-export.ts`.
 */
export type FrameEncoder = (frames: readonly CompositeState[], config: VideoEncodeConfig) => Promise<EncodedVideo>;

// ---------------------------------------------------------------------------
// Graph walk helpers
// ---------------------------------------------------------------------------

/** Narrow the graph's node multiset to the `css` projection nodes. */
function cssProjections(graph: DocumentGraph): readonly ProjectionNode[] {
  return graph.nodes.filter((node): node is ProjectionNode => node.family === 'projection' && node.target === 'css');
}

/** First component node, the source a css projection's `sourceRef` points at. */
function componentFor(graph: DocumentGraph, ref: ContentAddress): ComponentNode | undefined {
  return graph.nodes.find((node): node is ComponentNode => node.family === 'component' && node.id === ref);
}

/** All pose nodes — the static, design-time keyed variants the casts replay. */
function poses(graph: DocumentGraph): readonly PoseNode[] {
  return graph.nodes.filter((node): node is PoseNode => node.family === 'pose');
}

/**
 * Reconstruct the live {@link Boundary} a component encodes from its inline
 * `thresholds` + `states` (carried on {@link ComponentNode} precisely so eval
 * is reproducible without re-reading the boundary registry). This is the bridge
 * the existing casters need: both `CSSCompiler.compile` and `Compositor` take a
 * boundary, and the graph node is the authoritative source for it.
 */
function boundaryOf(component: ComponentNode): Boundary.Shape {
  const states = (component.states ?? []) as readonly string[];
  const thresholds = (component.thresholds ?? []) as readonly number[];
  const at = states.map((state, i) => [thresholds[i] ?? 0, state] as const);
  // Boundary.make requires a non-empty tuple — validate before the cast lies,
  // so an empty ComponentNode fails with a clear message, not a cryptic one.
  if (at.length === 0) {
    throw new Error(
      `dual-export: ComponentNode "${component.name}" has no states/thresholds — cannot reconstruct a Boundary for the cast.`,
    );
  }
  return Boundary.make({
    input: component.name,
    at: at as unknown as readonly [readonly [number, string], ...(readonly [number, string])[]],
  }) as Boundary.Shape;
}

// ---------------------------------------------------------------------------
// Astro page caster
// ---------------------------------------------------------------------------

/**
 * Cast the graph's css projections to a static Astro page string.
 *
 * Walks each `css` {@link ProjectionNode} → its source {@link ComponentNode} →
 * `CSSCompiler.compile` (the existing compiler) for the `<style>` block, then
 * `resolveInitialState` + `satelliteAttrs` (the existing astro helpers) for the
 * satellite shell. The page bytes are content-addressed via
 * `AddressedDigest.of(CanonicalCbor.encode(...))` — the core kernel, never
 * JSON/cborg — and returned as a sealed `ExportNode{carrier:'astro-page'}`
 * whose `sourceRefs` are exactly the projection ids it consumed.
 */
export function exportAstroPage(graph: DocumentGraph): ExportNode {
  const projections = cssProjections(graph);
  const sourceRefs: ContentAddress[] = [];
  const styleBlocks: string[] = [];
  const shells: string[] = [];

  for (const projection of projections) {
    sourceRefs.push(projection.id);
    const component = componentFor(graph, projection.sourceRef);
    if (!component) continue;

    const boundary = boundaryOf(component);
    // Per-state CSS inputs — drive the REAL CSSCompiler with the bindings the
    // graph's poses pinned at each state (a flat per-state property map).
    const states: Record<string, Record<string, string>> = {};
    for (const pose of poses(graph)) {
      const props: Record<string, string> = {};
      for (const [key, value] of Object.entries(pose.bindings)) {
        props[`--${key}`] = String(value);
      }
      states[pose.state as string] = props;
    }
    const selector = `.${component.name}`;
    const compiled = CSSCompiler.compile(boundary, states, selector);
    styleBlocks.push(compiled.raw);

    const initialState = resolveInitialState(boundary);
    const attrs = satelliteAttrs({ boundary, initialState, directive: false });
    const attrStr = Object.entries(attrs)
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ');
    shells.push(`<div ${attrStr}></div>`);
  }

  const page = [
    '<!doctype html>',
    '<html>',
    '<head>',
    `<style>${styleBlocks.join('\n')}</style>`,
    '</head>',
    '<body>',
    shells.join('\n'),
    '</body>',
    '</html>',
  ].join('\n');

  // Content-address the artifact bytes through the ONE kernel.
  const artifactDigest: AddressedDigest = AddressedDigestNS.of(
    CanonicalCbor.encode({ _tag: 'AstroPageArtifact', _version: 1, page }),
  );

  return sealNode({
    _tag: 'DocGraphExportNode',
    _version: 1,
    family: 'export',
    id: '' as ContentAddress,
    meta: graph.meta,
    carrier: 'astro-page',
    sourceRefs,
    artifactDigest,
  });
}

// ---------------------------------------------------------------------------
// Video caster
// ---------------------------------------------------------------------------

/** A pose-driven quantizer: holds a graph component's boundary, parks on a state. */
function poseQuantizer(boundary: Boundary.Shape, initialState: string): Quantizer<Boundary.Shape> {
  let current = initialState;
  return {
    _tag: 'Quantizer',
    boundary,
    state: Effect.succeed(current),
    stateSync: () => current,
    changes: undefined as never,
    evaluate(value: number) {
      current = Boundary.evaluate(boundary, value) as string;
      return current;
    },
  };
}

/** The fixed deterministic spec the video cast renders at. */
const VIDEO_CONFIG = { fps: 4, width: 16, height: 16, durationMs: 1000 as Millis } as const;

/**
 * A produced video frame: the compositor snapshot PLUS the per-track discrete
 * states the swept signal actually crossed. `compute()` reflects only the parked
 * pose, so the evaluated crossing track is captured here and folded into the
 * artifact digest — a graph that CAN cross addresses differently than one that
 * cannot. The byte-encoders consume `composite` only.
 */
type VideoFrame = { readonly composite: CompositeState; readonly posed: Record<string, string> };

/**
 * Produce the REAL per-frame {@link CompositeState} snapshots for the graph's
 * video cast. Builds the REAL Compositor (one pose-parked quantizer per pose)
 * and the REAL VideoRenderer over it; the renderer owns the fixed-step
 * schedule/total-frame count. We drive its compositor + clock directly (its
 * `frames()` async generator computes synchronously) so this stays sync and
 * headless: each frame is the genuine compositor output VideoRenderer yields.
 *
 * This is the SAME frame stream both byte-encoders consume — the browser
 * WebCodecs `captureVideo` and the node ffmpeg {@link FrameEncoder}. They
 * change the BYTES, never WHAT the frames are.
 */
function produceVideoFrames(graph: DocumentGraph): VideoFrame[] {
  const projections = cssProjections(graph);
  return Effect.runSync(
    Effect.scoped(
      Effect.gen(function* () {
        const compositor = yield* Compositor.create();
        const posed = poses(graph);
        // Keep each added quantizer + its boundary so the per-frame schedule can
        // drive `evaluate` over a swept input. A pose-parked quantizer that is
        // never evaluated yields a frozen frame stream — a degenerate "video";
        // driving `evaluate` across the boundary's threshold span makes the cast
        // genuinely animate across the component's states over its duration, and
        // folds that crossing track into the artifact digest below so the video
        // address is a true content address of what plays, not the frozen pose.
        // `lo`/`hi` span the boundary's threshold range. `boundaryOf` guarantees
        // a non-empty thresholds tuple (it throws otherwise), so the endpoints
        // are always present — no defensive fallback branch to leave uncovered.
        const driven: { key: string; quantizer: Quantizer<Boundary.Shape>; lo: number; hi: number }[] = [];
        for (const projection of projections) {
          const component = componentFor(graph, projection.sourceRef);
          if (!component) continue;
          const boundary = boundaryOf(component);
          const thresholds = boundary.thresholds as readonly number[];
          const lo = thresholds[0]!;
          const hi = thresholds[thresholds.length - 1]!;
          for (const pose of posed) {
            const key = `${component.name}:${pose.state}`;
            const quantizer = poseQuantizer(boundary, pose.state as string);
            yield* compositor.add(key, quantizer);
            driven.push({ key, quantizer, lo, hi });
          }
        }
        const renderer = VideoRenderer.make(VIDEO_CONFIG, compositor);
        // `denom` is the number of inter-frame steps; clamped to ≥1 so the sweep
        // is well-defined for any frame count without a dead conditional branch.
        const denom = Math.max(1, renderer.totalFrames - 1);
        const collected: VideoFrame[] = [];
        for (let i = 0; i < renderer.totalFrames; i++) {
          renderer.scheduler.step();
          // Sweep the input across the boundary's threshold span as the clock
          // advances so each quantizer's `evaluate` re-derives its state per frame
          // (a real boundary crossing over the video's timeline). Marking each
          // driven quantizer dirty makes `compute()` read its swept state instead
          // of carrying forward the previous composite — the same evaluate→mark-
          // dirty contract the worker compositor uses. The crossing is also
          // captured in `posed` so the artifact digest records it explicitly.
          const progress = i / denom;
          const posedFrame: Record<string, string> = {};
          for (const { key, quantizer, lo, hi } of driven) {
            posedFrame[key] = quantizer.evaluate(lo + (hi - lo) * progress) as string;
            compositor.runtime.markDirty(key);
          }
          collected.push({ composite: yield* compositor.compute(), posed: posedFrame });
        }
        return collected;
      }),
    ),
  );
}

/** Content-address the frame-level video artifact (spec + frame snapshots + crossing track). */
function videoFrameDigest(frames: readonly VideoFrame[], encodedBytes?: AddressedDigest): AddressedDigest {
  return AddressedDigestNS.of(
    CanonicalCbor.encode({
      _tag: 'VideoArtifact',
      _version: 1,
      config: {
        fps: VIDEO_CONFIG.fps,
        width: VIDEO_CONFIG.width,
        height: VIDEO_CONFIG.height,
        durationMs: VIDEO_CONFIG.durationMs,
      },
      frames: frames.map((frame) => ({
        discrete: frame.composite.discrete,
        css: frame.composite.outputs.css,
        posed: frame.posed,
      })),
      // When a real byte-encode ran, fold its byte digest into the address so
      // the export node is a content address of the ENCODED video, not only the
      // frames. Absent (frame-digest-only) when no encoder was injected.
      encodedBytes: encodedBytes ? encodedBytes.integrity_digest : null,
    }),
  );
}

/**
 * Cast the graph's Pose/Projection-derived state to a deterministic video,
 * content-addressing the produced per-frame `CompositeState` snapshots (NOT the
 * encoded bytes). For the REAL byte-encode use {@link exportVideoEncoded} with
 * an injected {@link FrameEncoder} (headless: the ffmpeg adapter in
 * `./ffmpeg-encoder`; browser: WebCodecs `captureVideo`). This frame-level cast
 * stays sync + codec-free so the dual-export proof never depends on a codec.
 */
export function exportVideo(
  graph: DocumentGraph,
  // The codec byte-encode seam: in a browser/worker this is the real
  // `captureVideo` (WebCodecs over an OffscreenCanvas). Left undefined here
  // because OffscreenCanvas/WebCodecs are absent in a headless test env; the
  // artifact digest content-addresses the produced frames regardless, so the
  // proof does not depend on the codec running. Typed against the real
  // `captureVideo` so a caller can wire it without a shape mismatch.
  encode?: typeof captureVideo,
): ExportNode {
  void encode;
  const sourceRefs: ContentAddress[] = cssProjections(graph).map((p) => p.id);
  const frames = produceVideoFrames(graph);
  const artifactDigest = videoFrameDigest(frames);

  return sealNode({
    _tag: 'DocGraphExportNode',
    _version: 1,
    family: 'export',
    id: '' as ContentAddress,
    meta: graph.meta,
    carrier: 'video',
    sourceRefs,
    artifactDigest,
  });
}

/** The result of a REAL byte-encoded video cast: the export node + its bytes. */
export interface EncodedVideoExport {
  /** The sealed video {@link ExportNode}; its `artifactDigest` pins the byte digest. */
  readonly node: ExportNode;
  /** The real encoded video the injected {@link FrameEncoder} produced. */
  readonly encoded: EncodedVideo;
  /** Content address of the encoded container bytes (the mp4 byte stream). */
  readonly bytesDigest: AddressedDigest;
}

/**
 * Cast the graph to a video AND run a REAL byte-encode through the injected
 * {@link FrameEncoder}. Produces the same frame stream as {@link exportVideo},
 * hands it to the encoder (ffmpeg headless, or WebCodecs in a browser wrapper),
 * and folds the encoded bytes' content address into the export node's
 * `artifactDigest`. Stage's core imports no codec — `encode` is injected.
 *
 * This is the headless byte path made HONEST: the returned `encoded.bytes` are
 * a real container (a validatable MP4 when the ffmpeg adapter is used), and the
 * node's digest is a content address OF those bytes, not just the frames.
 */
export async function exportVideoEncoded(graph: DocumentGraph, encode: FrameEncoder): Promise<EncodedVideoExport> {
  const sourceRefs: ContentAddress[] = cssProjections(graph).map((p) => p.id);
  const frames = produceVideoFrames(graph);

  const encoded = await encode(
    frames.map((frame) => frame.composite),
    {
      fps: VIDEO_CONFIG.fps,
      width: VIDEO_CONFIG.width,
      height: VIDEO_CONFIG.height,
      durationMs: VIDEO_CONFIG.durationMs,
    },
  );

  // Content-address the REAL encoded bytes, then pin that into the node digest.
  const bytesDigest = AddressedDigestNS.of(encoded.bytes);
  const artifactDigest = videoFrameDigest(frames, bytesDigest);

  const node = sealNode<ExportNode>({
    _tag: 'DocGraphExportNode',
    _version: 1,
    family: 'export',
    id: '' as ContentAddress,
    meta: graph.meta,
    carrier: 'video',
    sourceRefs,
    artifactDigest,
  });

  return { node, encoded, bytesDigest };
}

// ---------------------------------------------------------------------------
// Dual export + parent merge receipt
// ---------------------------------------------------------------------------

/** The provable result of casting one graph to two carriers from one source. */
export interface DualExportResult {
  /** The ONE source digest both casts derive from — `=== graph.digest`. */
  readonly sharedSourceDigest: AddressedDigest;
  /** The static-page carrier (`carrier: 'astro-page'`). */
  readonly astro: ExportNode;
  /** The video carrier (`carrier: 'video'`). */
  readonly video: ExportNode;
  /** Per-cast child receipts (genesis envelopes), kept for replay/audit. */
  readonly astroReceipt: ReceiptEnvelope;
  readonly videoReceipt: ReceiptEnvelope;
  /**
   * The single assertable head: a parent MERGE envelope whose
   * `previous = [astroReceipt.hash, videoReceipt.hash]` and whose payload pins
   * `sharedSourceDigest`. Both child casts resolve to the same `graph.id`.
   */
  readonly receipt: ReceiptEnvelope;
}

/** Mint a genesis child receipt that pins one carrier's artifact digest to the shared source. */
function childReceipt(
  carrier: ExportNode['carrier'],
  exportNode: ExportNode,
  graph: DocumentGraph,
): Effect.Effect<ReceiptEnvelope> {
  return Effect.gen(function* () {
    const payload: TypedRef.Shape = yield* TypedRef.create(`czap/stage.export.${carrier}`, {
      carrier,
      exportId: exportNode.id,
      artifactDigest: exportNode.artifactDigest.display_id,
      sourceDigest: graph.digest.display_id,
      graphId: graph.id,
      sourceRefs: exportNode.sourceRefs,
    });
    return yield* Receipt.createEnvelope(
      `stage.export.${carrier}`,
      { type: 'artifact', id: exportNode.id },
      payload,
      HLC.increment(HLC.create('czap-stage'), 1),
      Receipt.GENESIS,
    );
  });
}

/**
 * THE JEWEL. Cast one {@link DocumentGraph} to a static Astro page AND a video,
 * then prove both derive from one source.
 *
 * 1. `sharedSourceDigest = graph.digest` — the graph's own integrity digest,
 *    minted by the keystone kernel over the canonical source bytes.
 * 2. Run both EXISTING casters: {@link exportAstroPage} + {@link exportVideo}.
 *    Both `ExportNode`s carry `sourceRefs` resolving into the same `graph.id`.
 * 3. Mint a child receipt per cast, then a PARENT MERGE envelope whose
 *    `previous = [astroReceipt.hash, videoReceipt.hash]` and whose payload pins
 *    `sharedSourceDigest`. The merge envelope is the single assertable head.
 */
export function dualExport(graph: DocumentGraph): Promise<DualExportResult> {
  return Effect.runPromise(
    Effect.gen(function* () {
      // (1) shared source = the graph's OWN integrity digest. The keystone
      // kernel (`addressDocumentGraph`, ADR-0003/0011) already minted this over
      // the canonical bytes of the graph's sorted node ids + edges — node
      // payloads ride in transitively, since each node id is itself a content
      // address of its payload. Re-encoding the whole graph object would hash a
      // DIFFERENT (non-canonical) byte sequence, so we take `graph.digest`
      // verbatim: this is the SINGLE source address both casts derive from.
      const sharedSourceDigest = graph.digest;

      // (2) run both EXISTING casters.
      const astro = exportAstroPage(graph);
      const video = exportVideo(graph);

      // (3) child receipts, then the parent merge head.
      const astroReceipt = yield* childReceipt('astro-page', astro, graph);
      const videoReceipt = yield* childReceipt('video', video, graph);

      const mergePayload: TypedRef.Shape = yield* TypedRef.create('czap/stage.dual-export.merge', {
        sharedSourceDigest: sharedSourceDigest.display_id,
        sharedSourceIntegrity: sharedSourceDigest.integrity_digest,
        graphId: graph.id,
        astroExportId: astro.id,
        videoExportId: video.id,
      });

      const receipt = yield* Receipt.createEnvelope(
        'stage.dual-export',
        { type: 'artifact', id: graph.id },
        mergePayload,
        HLC.increment(HLC.create('czap-stage'), 2),
        [astroReceipt.hash, videoReceipt.hash],
      );

      return { sharedSourceDigest, astro, video, astroReceipt, videoReceipt, receipt };
    }),
  );
}

// ---------------------------------------------------------------------------
// Headless dual export — the proof PLUS a real injected byte-encode
// ---------------------------------------------------------------------------

/**
 * The result of a HEADLESS dual export: the full {@link DualExportResult} proof
 * PLUS the real encoded video the injected {@link FrameEncoder} produced.
 */
export interface DualExportNodeResult extends DualExportResult {
  /**
   * The real encoded video (a validatable MP4 when the ffmpeg adapter is used).
   * This rides ALONGSIDE the proof — the proof's `video` carrier remains a
   * content address of the produced FRAMES, never the encoded bytes, so the
   * page-digest == video-source-digest invariant is identical to {@link dualExport}.
   */
  readonly encoded: EncodedVideo;
  /** Content address of the encoded container bytes (the mp4 byte stream). */
  readonly bytesDigest: AddressedDigest;
}

/**
 * THE JEWEL, HEADLESS. Run the full {@link dualExport} proof in node/CI AND run a
 * REAL byte-encode through the injected {@link FrameEncoder} so a node caller gets
 * a genuine MP4 — not a browser-gated one.
 *
 * Determinism / invariant: the dual-export PROOF is taken verbatim from
 * {@link dualExport}, whose video carrier content-addresses the produced FRAMES
 * (NOT the encoded bytes). The byte-encode is the INJECTED seam and rides
 * alongside as `encoded`/`bytesDigest`; it never touches the proof's frame digest.
 * Both `dualExport(graph)` and `produceVideoFrames(graph)` walk the SAME graph
 * deterministically, so the frames the proof addresses are exactly the frames the
 * encoder receives — the page-digest == video-source-digest assertion holds
 * headless, identical to the browser path.
 *
 * Stage's core imports no codec: `encode` is injected. In node, wire
 * `ffmpegFrameEncoder()` from `@czap/stage/ffmpeg` (env-gate with
 * `ffmpegEncodeAvailable()` first); in a browser wrapper, wire WebCodecs.
 *
 * @example
 * ```ts
 * import { dualExportNode } from '@czap/stage';
 * import { ffmpegFrameEncoder, ffmpegEncodeAvailable } from '@czap/stage/ffmpeg';
 *
 * if (ffmpegEncodeAvailable()) {
 *   const r = await dualExportNode(graph, ffmpegFrameEncoder());
 *   // r.encoded.bytes is a real, ffprobe-validatable MP4
 *   // r.sharedSourceDigest === graph.digest — the proof still holds headless
 * }
 * ```
 */
export async function dualExportNode(graph: DocumentGraph, encode: FrameEncoder): Promise<DualExportNodeResult> {
  // The proof — page + frame-addressed video carrier + the parent merge head.
  // Untouched by the byte-encode, so the invariant is byte-for-byte `dualExport`.
  const proof = await dualExport(graph);
  // The real injected byte-encode over the SAME deterministic frame stream.
  const { encoded, bytesDigest } = await exportVideoEncoded(graph, encode);
  return { ...proof, encoded, bytesDigest };
}
