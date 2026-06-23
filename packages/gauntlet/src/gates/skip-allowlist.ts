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
 * skip is allowed ONLY if it is ENUMERATED here.
 *
 * PER-SITE, NOT PER-FILE (the second-review hole). The first cut sanctioned a whole
 * FILE: ANY skip anywhere in an enumerated file passed. That made a sanctioned file a
 * BLIND SPOT — adding a NEW, unrelated `it.skip` (a different capability, or a genuine
 * placeholder) to a sanctioned file shipped green. Now each entry pins a SPECIFIC skip
 * SITE: the {@link SanctionedSkip.site} discriminator is the whitespace-collapsed RAW
 * source line the sanctioned skip sits on (the capability-guard expression / the test
 * title survive there — `describe.skipIf(!canUseSAB)(…)`, `FFMPEG_RENDER_CAPABLE ? it :
 * it.skip`, `it.skip('ffmpeg libx264 render probe failed', …)`). A skip in a sanctioned
 * file is allowed ONLY when its own normalized line MATCHES a declared site for that
 * file; ANY other skip in that file — a different capability, a new unrelated skip — is
 * BLOCKING. The site is line-number-INDEPENDENT (it pins the line's CONTENT, not its
 * position), so re-ordering the file does not break it; re-WORDING the exact sanctioned
 * line does (intentionally — it re-opens the question, the strengthening posture).
 *
 * This is a STANDARDS ELEMENT (the standards-surface extractor folds it into the
 * content-addressed snapshot, the same way it folds a {@link Waiver}). ADDING an entry
 * is a WEAKEN (more is skipped) — it shows up in the raccoon-rule diff and must be an
 * intentional, reviewed snapshot regeneration. REMOVING one (re-enabling a test, or
 * deleting a dead skip) is a STRENGTHEN.
 *
 * Composition over inheritance: each entry is a flat `_tag`-free DATA record (file +
 * capability + the site discriminator + reason); the matcher is a standalone function
 * over the union. No classes. The {@link normalizeSiteLine} normalizer is pure with NO
 * dependency (the lean engine never reaches for `@czap/core`).
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
 * One sanctioned skip — a `(file, site, capability, why)` record sanctioning a SPECIFIC
 * skip SITE, not a whole file.
 *
 * The `file` is the repo-relative path the skip lives in; the `site` is the STABLE
 * discriminator of the exact sanctioned skip LINE within it (see {@link normalizeSiteLine}
 * — the whitespace-collapsed raw source line, line-number-independent). Only a skip whose
 * normalized line equals a declared `site` for its file is sanctioned; every other skip in
 * that file is BLOCKING. The `why` is the human justification of record, woven into the
 * standards surface.
 */
export interface SanctionedSkip {
  /** Repo-relative path of the test file whose skip is sanctioned. */
  readonly file: string;
  /**
   * The SITE discriminator — the whitespace-collapsed raw source line the sanctioned
   * skip sits on (the capability-guard expression / test title survive there). Pins the
   * line's CONTENT, not its position, so re-ordering the file does not break it. Computed
   * via {@link normalizeSiteLine} from the exact sanctioned line; a guard test pins each
   * entry against the live source so a re-worded skip re-opens the sanction (strengthen).
   */
  readonly site: string;
  /** The capability whose absence sanctions the skip. */
  readonly capability: SkipCapability;
  /** The justification of record — why this skip is honest, not unfinished work. */
  readonly why: string;
}

/**
 * NORMALIZE a source line into the stable SITE discriminator: collapse every run of
 * whitespace to a single space, then trim. Pure, dependency-free (the lean engine never
 * imports `@czap/core`). The same normalization is applied to BOTH the enumerated `site`
 * values below AND the live skip line at scan time, so the comparison is exact and
 * indentation/reflow-tolerant while preserving the surviving code tokens (the guard
 * expression, the runner verb) that identify the site.
 */
export function normalizeSiteLine(line: string): string {
  return line.replace(/\s+/g, ' ').trim();
}

/**
 * THE ENUMERATED ALLOWLIST — every sanctioned capability-gated skip in `tests/`
 * (outside `tests/generated/`, which the separate plumb-gate owns), at SITE granularity.
 * Each entry was found by sweeping the test tree for every skip form (`it.skip` /
 * `test.skip` / `describe.skipIf` / `it.runIf` / the `cond ? it : it.skip` alias) with
 * the SAME {@link detectSkips} detector the gate uses, then pinning the exact skip line.
 * A skip whose `(file, site)` is NOT enumerated is a BLOCKING finding — that is the whole
 * point: the legit skips are explicit at site granularity, every other skip (including a
 * NEW one in a sanctioned file) is a lie caught.
 *
 * Sorted by file (then site) for a stable, reviewable surface (the standards extractor
 * re-sorts by the canonical element key regardless).
 */
export const SANCTIONED_SKIPS: readonly SanctionedSkip[] = [
  {
    file: 'tests/browser/spsc-ring-browser.test.ts',
    site: "describe.skipIf(!canUseSAB)('browser SPSCRing with real SharedArrayBuffer and Atomics', () => {",
    capability: 'shared-array-buffer-absent',
    why: 'the real-SharedArrayBuffer SPSCRing test needs cross-origin isolation (COOP/COEP); absent it skips (the in-process ring is covered elsewhere).',
  },
  {
    file: 'tests/e2e/astro-directives.e2e.ts',
    site: "test.skip(!built, 'astro example not built — run: pnpm exec tsx tests/integration/astro/test.ts');",
    capability: 'astro-example-not-built',
    why: 'the browser e2e needs the built Astro example dist; the gauntlet runs the integration build before the e2e lane, so CI always exercises it.',
  },
  {
    file: 'tests/integration/cli/idempotency.test.ts',
    site: 'const renderIt = FFMPEG_RENDER_CAPABLE ? it : it.skip;',
    capability: 'ffmpeg-absent',
    why: 'the render-idempotency check encodes frames through ffmpeg+libx264; absent the codec it skips (the host context unit covers the encode path).',
  },
  {
    file: 'tests/integration/cli/scene-dev.test.ts',
    site: 'const conditionalIt = underCoverage ? it.skip : it;',
    capability: 'coverage-instrumentation',
    why: 'the spawned tsx→vite-server pipeline trips a v8-coverage-vs-vite STATUS_ACCESS_VIOLATION on Windows; the in-process server.test.ts covers the same startDevServer() path under coverage.',
  },
  {
    file: 'tests/integration/cli/scene-render.test.ts',
    site: 'const renderIt = FFMPEG_RENDER_CAPABLE ? it : it.skip;',
    capability: 'ffmpeg-absent',
    why: 'the scene-render CLI test renders an mp4 through ffmpeg+libx264; absent the codec it skips.',
  },
  {
    file: 'tests/property/boundary-evaluate-batch.prop.test.ts',
    site: "describe.skipIf(!wasmPresent)('Boundary.evaluateBatch agrees with scalar evaluate (Rust kernel loaded)', () => {",
    capability: 'wasm-absent',
    why: 'the Boundary.evaluateBatch parity property needs the loaded Rust kernel; absent the wasm it skips (the scalar evaluate path is covered without it).',
  },
  {
    file: 'tests/smoke/intro-render.test.ts',
    site: "it.skip('skipped — ffmpeg libx264 render probe failed (see czap doctor)', () => {});",
    capability: 'ffmpeg-absent',
    why: 'the end-to-end intro-scene smoke render needs ffmpeg+libx264; absent the codec it skips (see `czap doctor`).',
  },
  {
    file: 'tests/unit/command/error-contract.test.ts',
    site: "it.runIf(FFMPEG_RENDER_CAPABLE)('a stream failure mentioning stdin/EPIPE surfaces the probe verdict', async () => {",
    capability: 'ffmpeg-absent',
    why: 'the stream-failure probe (EPIPE/stdin) runs only when ffmpeg+libx264 is capable (a `runIf` gate on the real render backend).',
  },
  {
    file: 'tests/unit/command/ffmpeg-render-backend.test.ts',
    site: "test.skip('ffmpeg+libx264 render (skipped — codec not on PATH)', () => {",
    capability: 'ffmpeg-absent',
    why: 'the real ffmpeg+libx264 render backend test skips when the codec is not on PATH.',
  },
  {
    file: 'tests/unit/command/host-context.test.ts',
    site: "it.runIf(FFMPEG_RENDER_CAPABLE)('renderScene encodes frames through ffmpeg when libx264 is available', async () => {",
    capability: 'ffmpeg-absent',
    why: 'renderScene-through-ffmpeg runs only when libx264 is available (a `runIf` gate on the real backend).',
  },
  {
    file: 'tests/unit/core/wasm-parity.test.ts',
    site: "describe.skipIf(!wasmPresent)('WASM/TS kernel parity (czap-compute vs fallbackKernels)', () => {",
    capability: 'wasm-absent',
    why: 'the WASM/TS kernel parity suite — the arm that runs when the Rust kernel IS loaded (compares czap-compute against fallbackKernels).',
  },
  {
    file: 'tests/unit/core/wasm-parity.test.ts',
    site: "describe.skipIf(wasmPresent)('WASM/TS kernel parity (artifact absent — fallbackKernels is what ships here)', () => {",
    capability: 'wasm-absent',
    why: 'the WASM/TS kernel parity suite — the INVERSE arm that runs when the wasm artifact is ABSENT (the fallback is what ships there).',
  },
  {
    file: 'tests/unit/core/wasm-shipping.test.ts',
    site: "it.skipIf(!staged)('resolves @czap/core dist/czap-compute.wasm via the module graph', () => {",
    capability: 'wasm-dist-staged',
    why: 'the module-graph resolution of @czap/core dist/czap-compute.wasm runs only when the built artifact is staged (a publish-shape probe).',
  },
  {
    file: 'tests/unit/stage/dual-export-node.test.ts',
    site: "test.skip('headless dual-export end to end (skipped — codec not on PATH)', () => {",
    capability: 'ffmpeg-absent',
    why: 'the headless dual-export end-to-end test skips when the ffmpeg+libx264 codec is not on PATH.',
  },
  {
    file: 'tests/unit/stage/ffmpeg-encoder.test.ts',
    site: "test.skip('ffmpeg+libx264 encode (skipped — codec not on PATH)', () => {",
    capability: 'ffmpeg-absent',
    why: 'the real ffmpeg+libx264 encode test skips when the codec is not on PATH.',
  },
];

/**
 * O(1) membership by `(file → set of sanctioned site discriminators)` — the gate's
 * allow-or-block decision, per SITE. A file maps to the set of its enumerated normalized
 * site lines; a skip is sanctioned iff its file is present AND its own normalized line is
 * in that set. (A file can carry MULTIPLE sanctioned sites — e.g. the wasm-parity dual
 * arms — so the value is a set, not a single entry.)
 */
const SANCTIONED_BY_SITE: ReadonlyMap<string, ReadonlyMap<string, SanctionedSkip>> = (() => {
  const byFile = new Map<string, Map<string, SanctionedSkip>>();
  for (const s of SANCTIONED_SKIPS) {
    let sites = byFile.get(s.file);
    if (sites === undefined) {
      sites = new Map<string, SanctionedSkip>();
      byFile.set(s.file, sites);
    }
    sites.set(normalizeSiteLine(s.site), s);
  }
  return byFile;
})();

/**
 * Is the skip at `siteLine` in `file` SANCTIONED? A skip is allowed ONLY if its file is
 * enumerated in {@link SANCTIONED_SKIPS} AND its own normalized source line MATCHES a
 * declared site for that file. `siteLine` is the RAW source line the skip sits on (the
 * caller passes it un-normalized; this normalizes both sides). Returns the matching entry
 * (for the visible-audit detail) or `undefined` when the skip is unsanctioned (→ BLOCKING)
 * — including a NEW, unrelated skip in an otherwise-sanctioned file.
 */
export function sanctionedSkipFor(file: string, siteLine: string): SanctionedSkip | undefined {
  return SANCTIONED_BY_SITE.get(file)?.get(normalizeSiteLine(siteLine));
}

/** Does `file` carry ANY sanctioned skip site at all? (Cheap pre-check / audit helper.) */
export function fileHasSanctionedSkip(file: string): boolean {
  return SANCTIONED_BY_SITE.has(file);
}
