/**
 * The SANCTIONED CAPABILITY-GATED SKIP allowlist — the waiver-with-teeth that makes
 * every legitimate skip in the `tests/` tree VISIBLE + auditable.
 *
 * The owner's hardest law is "no placeholders ever / no `it.skip`": a skip ships green
 * while proving nothing. But he ALSO sanctions a small, enumerated set of HONEST
 * capability-gated skips — a render test that needs ffmpeg+libx264 on PATH, a WASM
 * parity test that needs the compiled Rust kernel staged, a `SharedArrayBuffer` browser
 * test that needs cross-origin isolation, an integration test that is REDUNDANT under
 * v8 coverage instrumentation. Those skips are not unfinished work; they are honest
 * "this capability is absent in this environment" guards.
 *
 * The bug this allowlist cures: those skips lived OUTSIDE the gate's scope
 * (`context.files()` is IR-only — `packages/* /src`), so the always-blocking
 * `noSkippedTestGate` governed NONE of them. Invisible-because-out-of-scope is the
 * defect. Now the gate reads the WHOLE governed test corpus via `allFiles()`, and a
 * skip is allowed ONLY if it is ENUMERATED here. Any skip NOT in this list is BLOCKING —
 * the always-blocking law restored, with the legit set made explicit so the owner can
 * see exactly which skips exist and why.
 *
 * This is a STANDARDS ELEMENT (the standards-surface extractor folds it into the
 * content-addressed snapshot, the same way it folds a {@link Waiver}). ADDING an entry
 * is a WEAKEN (more is skipped) — it shows up in the raccoon-rule diff and must be an
 * intentional, reviewed snapshot regeneration. REMOVING one (re-enabling a test, or
 * deleting a dead skip) is a STRENGTHEN.
 *
 * Composition over inheritance: each entry is a flat `_tag`-free DATA record (file +
 * capability reason); the matcher is a standalone function over the union. No classes.
 *
 * @module
 */

/**
 * The closed set of CAPABILITIES whose absence sanctions a skip. Each names a real,
 * environment-detectable resource the skipped test genuinely requires — never a stand-in
 * for unfinished work. The reason is recorded on the standards surface so the owner reads
 * the WHY without opening the file.
 */
export type SkipCapability =
  | 'ffmpeg-absent' // an ffmpeg + libx264 render/encode probe failed (the codec is not on PATH)
  | 'wasm-absent' // the compiled Rust kernel (czap-compute.wasm) is not present in this run
  | 'wasm-dist-staged' // the built @czap/core dist wasm artifact is not staged (a publish-shape probe)
  | 'shared-array-buffer-absent' // SharedArrayBuffer / cross-origin isolation is unavailable
  | 'coverage-instrumentation' // the test is REDUNDANT (and crash-prone) under v8 coverage; the in-process unit covers the same path
  | 'astro-example-not-built'; // the built Astro example dist is absent (the integration build runs before the e2e lane)

/**
 * One sanctioned skip — a `(file, capability, why)` record. The `file` is the
 * repo-relative path the skip lives in; ANY skip in that file is sanctioned under the
 * named capability (a file's skips share one capability reason — a render test file
 * skips for ffmpeg; it does not also skip for an unrelated reason). The `why` is the
 * human justification of record, woven into the standards surface.
 */
export interface SanctionedSkip {
  /** Repo-relative path of the test file whose skip is sanctioned. */
  readonly file: string;
  /** The capability whose absence sanctions the skip. */
  readonly capability: SkipCapability;
  /** The justification of record — why this skip is honest, not unfinished work. */
  readonly why: string;
}

/**
 * THE ENUMERATED ALLOWLIST — every sanctioned capability-gated skip in `tests/`
 * (outside `tests/generated/`, which the separate plumb-gate owns). Each entry was
 * found by sweeping the test tree for every skip form (`it.skip` / `test.skip` /
 * `describe.skipIf` / `it.runIf` / the `cond ? it : it.skip` alias). A skip NOT in this
 * list is a BLOCKING finding — that is the whole point: the legit skips are explicit and
 * auditable, every other skip is a lie caught.
 *
 * Sorted by file for a stable, reviewable surface (the standards extractor re-sorts by
 * the canonical element key regardless).
 */
export const SANCTIONED_SKIPS: readonly SanctionedSkip[] = [
  {
    file: 'tests/browser/spsc-ring-browser.test.ts',
    capability: 'shared-array-buffer-absent',
    why: 'the real-SharedArrayBuffer SPSCRing test needs cross-origin isolation (COOP/COEP); absent it skips (the in-process ring is covered elsewhere).',
  },
  {
    file: 'tests/e2e/astro-directives.e2e.ts',
    capability: 'astro-example-not-built',
    why: 'the browser e2e needs the built Astro example dist; the gauntlet runs the integration build before the e2e lane, so CI always exercises it.',
  },
  {
    file: 'tests/integration/cli/idempotency.test.ts',
    capability: 'ffmpeg-absent',
    why: 'the render-idempotency check encodes frames through ffmpeg+libx264; absent the codec it skips (the host context unit covers the encode path).',
  },
  {
    file: 'tests/integration/cli/scene-dev.test.ts',
    capability: 'coverage-instrumentation',
    why: 'the spawned tsx→vite-server pipeline trips a v8-coverage-vs-vite STATUS_ACCESS_VIOLATION on Windows; the in-process server.test.ts covers the same startDevServer() path under coverage.',
  },
  {
    file: 'tests/integration/cli/scene-render.test.ts',
    capability: 'ffmpeg-absent',
    why: 'the scene-render CLI test renders an mp4 through ffmpeg+libx264; absent the codec it skips.',
  },
  {
    file: 'tests/property/boundary-evaluate-batch.prop.test.ts',
    capability: 'wasm-absent',
    why: 'the Boundary.evaluateBatch parity property needs the loaded Rust kernel; absent the wasm it skips (the scalar evaluate path is covered without it).',
  },
  {
    file: 'tests/smoke/intro-render.test.ts',
    capability: 'ffmpeg-absent',
    why: 'the end-to-end intro-scene smoke render needs ffmpeg+libx264; absent the codec it skips (see `czap doctor`).',
  },
  {
    file: 'tests/unit/command/error-contract.test.ts',
    capability: 'ffmpeg-absent',
    why: 'the stream-failure probe (EPIPE/stdin) runs only when ffmpeg+libx264 is capable (a `runIf` gate on the real render backend).',
  },
  {
    file: 'tests/unit/command/ffmpeg-render-backend.test.ts',
    capability: 'ffmpeg-absent',
    why: 'the real ffmpeg+libx264 render backend test skips when the codec is not on PATH.',
  },
  {
    file: 'tests/unit/command/host-context.test.ts',
    capability: 'ffmpeg-absent',
    why: 'renderScene-through-ffmpeg runs only when libx264 is available (a `runIf` gate on the real backend).',
  },
  {
    file: 'tests/unit/core/wasm-parity.test.ts',
    capability: 'wasm-absent',
    why: 'the WASM/TS kernel parity suite has two capability arms — one runs when the Rust kernel is loaded, the inverse runs when the wasm artifact is absent (the fallback is what ships there).',
  },
  {
    file: 'tests/unit/core/wasm-shipping.test.ts',
    capability: 'wasm-dist-staged',
    why: 'the module-graph resolution of @czap/core dist/czap-compute.wasm runs only when the built artifact is staged (a publish-shape probe).',
  },
  {
    file: 'tests/unit/stage/dual-export-node.test.ts',
    capability: 'ffmpeg-absent',
    why: 'the headless dual-export end-to-end test skips when the ffmpeg+libx264 codec is not on PATH.',
  },
  {
    file: 'tests/unit/stage/ffmpeg-encoder.test.ts',
    capability: 'ffmpeg-absent',
    why: 'the real ffmpeg+libx264 encode test skips when the codec is not on PATH.',
  },
];

/** O(1) membership by file — the gate's allow-or-block decision. */
const SANCTIONED_BY_FILE: ReadonlyMap<string, SanctionedSkip> = new Map(
  SANCTIONED_SKIPS.map((s) => [s.file, s] as const),
);

/**
 * Is a skip in `file` SANCTIONED? A skip is allowed ONLY if its file is enumerated in
 * {@link SANCTIONED_SKIPS}. Returns the entry (for the visible-audit detail) or
 * `undefined` when the skip is unsanctioned (→ BLOCKING).
 */
export function sanctionedSkipFor(file: string): SanctionedSkip | undefined {
  return SANCTIONED_BY_FILE.get(file);
}
