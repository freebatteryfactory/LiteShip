/**
 * The plumb-completeness ledger.
 *
 * Two honest, low-noise signals. (The cheap syntactic alternatives don't gate:
 * the audit's orphan findings are severity `info` and 350+ of them are type/
 * inference/test-only NOISE, not plumb debt; package import-reachability is
 * polluted by dev/CLI/build edges. So neither gates cleanly — and per-primitive
 * plumb-truth is instead proven by each item's end-to-end acceptance test that
 * drives it through the live runtime.)
 *
 *  1. `PACKAGE_PLUMB` — every published package classified as `runtime` (live in
 *     a consumer site), `tooling` (CLI/build/types — not a live-runtime cast
 *     path), or `deferred` (meant to be runtime-live but not yet plumbed; MUST
 *     carry an `issue`). A published package missing here fails the gate, so a
 *     new test-only subsystem (the scene/stage class — whole packages a consumer
 *     never runs) cannot ship unclassified/hidden. This is the headline guard.
 *
 * The capsule-harness side has NO floor: `scripts/plumb-gate.ts` fails on ANY
 * `it.skip` placeholder in `tests/generated/`. There is no grandfather list — an
 * unwired capsule binding is blocking work, not a pinned exemption. (A floor here
 * would launder exactly the incompleteness this gate exists to surface.)
 *
 * @module
 */

export type PackagePlumbStatus = 'runtime' | 'tooling' | 'deferred';

export interface PackagePlumbEntry {
  readonly status: PackagePlumbStatus;
  readonly reason: string;
  /** Tracking issue/ADR — REQUIRED for `deferred` (enforced by the meta-test). */
  readonly issue?: string;
}

/** Every published package's live-runtime plumb status. */
export const PACKAGE_PLUMB: Readonly<Record<string, PackagePlumbEntry>> = {
  // Live in a consumer site (SSR + client runtime / edge / build-plugin cast path).
  '@czap/error': {
    status: 'runtime',
    reason:
      'The foundational error algebra — every live failure path (runtime, edge, worker) throws/returns a @czap/error variant. Zero-dep; consumed by every package.',
  },
  '@czap/astro': { status: 'runtime', reason: 'The Astro integration + client runtime — the primary live cast surface.' },
  '@czap/core': { status: 'runtime', reason: 'The kernel: signals, boundaries, evaluator, content-addressing, graph IR.' },
  '@czap/canonical': { status: 'runtime', reason: 'Canonical CBOR/FNV identity — consumed by core on the live path.' },
  '@czap/detect': { status: 'runtime', reason: 'Capability detection — consumed by the runtime + edge.' },
  '@czap/quantizer': { status: 'runtime', reason: 'The output evaluator — consumed on the cast path.' },
  '@czap/compiler': { status: 'runtime', reason: 'CSS/ARIA/GLSL/WGSL dispatch arms — consumed via the boundary manifest.' },
  '@czap/web': { status: 'runtime', reason: 'Browser-host security/morph/audio primitives consumed by the runtime.' },
  '@czap/worker': { status: 'runtime', reason: 'Off-thread compositor — consumed by the runtime.' },
  '@czap/genui': { status: 'runtime', reason: 'GenUI render pipeline — consumed by the astro llm runtime.' },
  '@czap/edge': { status: 'runtime', reason: 'Edge tier detection + boundary cache — a live host surface.' },
  '@czap/vite': { status: 'runtime', reason: 'Build-time @quantize compile + the dev cast — part of the shipped pipeline.' },
  '@czap/cloudflare': { status: 'runtime', reason: 'Cloudflare host adapter — a live edge surface.' },
  '@czap/assets': { status: 'runtime', reason: 'Asset/audio analysis consumed by the build + scene pipeline.' },

  // Live in a consumer site as of 0.4.0: the scene→live bridge (item C) and the
  // SVG last-mile directive (item E) both import @czap/scene into the astro runtime.
  '@czap/scene': {
    status: 'runtime',
    reason: 'Plumbed live in 0.4.0: @czap/astro imports it via the scene→live bridge (scene-bridge.ts) and the SVG directive (svg.ts → applySvgAttrs).',
  },

  // CLI / build / types — not a live-runtime cast path.
  '@czap/cli': { status: 'tooling', reason: 'The `czap` CLI — a developer tool, not a runtime surface.' },
  '@czap/command': { status: 'tooling', reason: 'CLI command catalog/host — tooling.' },
  '@czap/mcp-server': { status: 'tooling', reason: 'MCP server — a developer-assistant surface, not site runtime.' },
  '@czap/audit': { status: 'tooling', reason: 'The audit engine — build/CI tooling.' },
  '@czap/remotion': { status: 'tooling', reason: 'Remotion offline video integration — build-time render, not live runtime.' },
  '@czap/stage': {
    status: 'tooling',
    reason: 'Dual-export proof (graph→page+video). 0.4.0 (item F) filled the headless node ffmpeg encode, so it is a complete BUILD/CI proof tool — not a live-site runtime surface.',
  },
  '@czap/_spine': { status: 'tooling', reason: 'The published type spine — declarations only, no runtime.' },
  liteship: { status: 'tooling', reason: 'The umbrella meta-package — re-exports, no runtime of its own.' },
  'create-liteship': { status: 'tooling', reason: 'The scaffolder — a one-shot CLI, not runtime.' },
};
