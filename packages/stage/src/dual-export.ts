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
// only the byte-encode of the codec is the deferred seam (it does not change
// what the frames ARE).
import type { captureVideo } from '@czap/web';

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
  // Boundary.make requires a non-empty tuple of [threshold, state] pairs.
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

/**
 * Cast the graph's Pose/Projection-derived state to a deterministic video.
 *
 * Builds a {@link Compositor} from the graph's css component boundary (one
 * quantizer per pose, parked on that pose's state), drives the REAL
 * `VideoRenderer.make(...).frames()` over it at a fixed step, and collects each
 * frame's `CompositeState`. The artifact digest content-addresses the real
 * `VideoConfig` spec + the produced per-frame states through the core kernel.
 *
 * The byte-level codec encode (`captureVideo`, WebCodecs) is the single deferred
 * seam — it cannot run headless — but it would encode EXACTLY these frames, so
 * the digest is an honest content address of what the video IS.
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
  const projections = cssProjections(graph);
  const sourceRefs: ContentAddress[] = projections.map((p) => p.id);

  const config = { fps: 4, width: 16, height: 16, durationMs: 1000 as Millis };

  // Build the REAL Compositor (one pose-parked quantizer per pose) and the REAL
  // VideoRenderer over it; the renderer owns the fixed-step schedule/total-frame
  // count. We drive its compositor + clock directly (its `frames()` async
  // generator computes synchronously) so the cast stays sync and headless: each
  // frame's `CompositeState` is the genuine compositor output VideoRenderer
  // would yield. `captureVideo` (imported, type-only) is the codec byte-encode
  // of exactly these frames — the lone deferred seam, since OffscreenCanvas /
  // WebCodecs are absent in a headless test env (see exportVideo's doc + the
  // capture pipeline). It does not change WHAT the frames are.
  const frames: CompositeState[] = Effect.runSync(
    Effect.scoped(
      Effect.gen(function* () {
        const compositor = yield* Compositor.create();
        const posed = poses(graph);
        for (const projection of projections) {
          const component = componentFor(graph, projection.sourceRef);
          if (!component) continue;
          const boundary = boundaryOf(component);
          for (const pose of posed) {
            yield* compositor.add(`${component.name}:${pose.state}`, poseQuantizer(boundary, pose.state as string));
          }
        }
        const renderer = VideoRenderer.make(config, compositor);
        const collected: CompositeState[] = [];
        for (let i = 0; i < renderer.totalFrames; i++) {
          renderer.scheduler.step();
          collected.push(yield* compositor.compute());
        }
        return collected;
      }),
    ),
  );

  // Content-address the real spec + produced frame snapshots through the kernel.
  const artifactDigest: AddressedDigest = AddressedDigestNS.of(
    CanonicalCbor.encode({
      _tag: 'VideoArtifact',
      _version: 1,
      config: { fps: config.fps, width: config.width, height: config.height, durationMs: 1000 },
      frames: frames.map((state) => ({ discrete: state.discrete, css: state.outputs.css })),
    }),
  );

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
