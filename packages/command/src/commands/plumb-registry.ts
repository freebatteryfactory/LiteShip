/**
 * The plumb-completeness ledger (relocated from `scripts/plumb-registry.ts` when
 * the gate became the `plumb` command). Pure data — no Node coupling — so the
 * host scan capability (`runPlumb`, provisioned in `@liteship/command/host`) can
 * import it without pulling fs into the pure registry entry.
 *
 * `PACKAGE_PLUMB` classifies every published package as `runtime` (live in a
 * consumer site), `tooling` (CLI/build/types — not a live-runtime cast path), or
 * `deferred` (meant to be runtime-live but not yet plumbed; MUST carry an
 * `issue`). A published package missing here fails the gate, so a new test-only
 * subsystem (whole packages a consumer never runs) cannot ship unclassified.
 * This is the headline guard.
 *
 * The capsule-harness side has NO floor: the `plumb` command fails on ANY
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
  '@liteship/error': {
    status: 'runtime',
    reason:
      'The foundational error algebra — every live failure path (runtime, edge, worker) throws/returns a @liteship/error variant. Zero-dep; consumed by every package.',
  },
  '@liteship/astro': {
    status: 'runtime',
    reason: 'The Astro integration + client runtime — the primary live cast surface.',
  },
  '@liteship/core': {
    status: 'runtime',
    reason: 'The kernel: signals, boundaries, evaluator, content-addressing, graph IR.',
  },
  '@liteship/canonical': {
    status: 'runtime',
    reason: 'Canonical CBOR/FNV identity — consumed by core on the live path.',
  },
  '@liteship/detect': { status: 'runtime', reason: 'Capability detection — consumed by the runtime + edge.' },
  '@liteship/quantizer': { status: 'runtime', reason: 'The output evaluator — consumed on the cast path.' },
  '@liteship/compiler': {
    status: 'runtime',
    reason: 'CSS/ARIA/GLSL/WGSL dispatch arms — consumed via the boundary manifest.',
  },
  '@liteship/web': {
    status: 'runtime',
    reason: 'Browser-host security/morph/audio primitives consumed by the runtime.',
  },
  '@liteship/worker': { status: 'runtime', reason: 'Off-thread compositor — consumed by the runtime.' },
  '@liteship/genui': { status: 'runtime', reason: 'GenUI render pipeline — consumed by the astro llm runtime.' },
  '@liteship/edge': { status: 'runtime', reason: 'Edge tier detection + boundary cache — a live host surface.' },
  '@liteship/vite': {
    status: 'runtime',
    reason: 'Build-time @quantize compile + the dev cast — part of the shipped pipeline.',
  },
  '@liteship/cloudflare': { status: 'runtime', reason: 'Cloudflare host adapter — a live edge surface.' },
  '@liteship/assets': { status: 'runtime', reason: 'Asset/audio analysis consumed by the build + scene pipeline.' },

  // Live in a consumer site as of 0.4.0: the scene→live bridge (item C) and the
  // SVG last-mile directive (item E) both import @liteship/scene into the astro runtime.
  '@liteship/scene': {
    status: 'runtime',
    reason:
      'Plumbed live in 0.4.0: @liteship/astro imports it via the scene→live bridge (scene-bridge.ts) and the SVG directive (svg.ts → applySvgAttrs).',
  },

  // CLI / build / types — not a live-runtime cast path.
  '@liteship/cli': { status: 'tooling', reason: 'The `liteship` CLI — a developer tool, not a runtime surface.' },
  '@liteship/command': { status: 'tooling', reason: 'CLI command catalog/host — tooling.' },
  '@liteship/mcp-server': {
    status: 'tooling',
    reason: 'MCP server — a developer-assistant surface, not site runtime.',
  },
  '@liteship/audit': { status: 'tooling', reason: 'The audit engine — build/CI tooling.' },
  '@liteship/gauntlet': {
    status: 'tooling',
    reason: 'The rigor engine — gates/findings/assurance/authority-ratchet; build/CI tooling, not site runtime.',
  },
  '@liteship/remotion': {
    status: 'tooling',
    reason: 'Remotion offline video integration — build-time render, not live runtime.',
  },
  '@liteship/stage': {
    status: 'tooling',
    reason:
      'Dual-export proof (graph→page+video). 0.4.0 (item F) filled the headless node ffmpeg encode, so it is a complete BUILD/CI proof tool — not a live-site runtime surface.',
  },
  '@liteship/_spine': { status: 'tooling', reason: 'The published type spine — declarations only, no runtime.' },
  liteship: { status: 'tooling', reason: 'The umbrella meta-package — re-exports, no runtime of its own.' },
  'create-liteship': { status: 'tooling', reason: 'The scaffolder — a one-shot CLI, not runtime.' },
};
