/**
 * THE CANONICAL CAPABILITY SYMBOL TABLE (node runtime) — the single definition site every
 * node-runtime capability-gated test skip links against. "The repo tells on itself."
 *
 * WHY THIS EXISTS (codex round-8, #1b). A sanctioned capability-gated skip must prove its guard
 * DERIVES FROM the declared capability's probe — not merely that it is *conditional* (an
 * `if (Math.random()) { it.skip("ffmpeg…") }` is conditional but unrelated). Rather than a
 * hand-curated, drift-prone capability→probe registry, the proof reads THIS module: each export
 * IS a capability probe, and the export NAME is the capability id (camelCase ↔ kebab — e.g.
 * `wasmAbsent` ↔ `wasm-absent`). The `capabilityGateLinkGate` (via the audit linker oracle) then
 * resolves every sanctioned skip's guard through the checker and verifies it reaches the export
 * whose name matches the skip's declared capability. Add a capability ⇒ add an export here; the
 * proof picks it up. Nothing else to maintain — the symbol table assembles itself from the repo.
 *
 * RUNTIME SPLIT. The sanctioned probes span runtimes; a node `node:fs`/spawn probe cannot be
 * imported by the real-browser SAB test. So the browser-safe probes live in the sibling
 * {@link file://./capabilities.browser.ts} (zero node imports); the linker reads BOTH modules as
 * one symbol table. This module is the NODE side (filesystem / env / ffmpeg-spawn probes).
 *
 * The cheap probes (fs `existsSync`, an env read) are eager module-level constants — the same cost
 * the inline per-file consts they replace already paid. The EXPENSIVE ffmpeg probe (it spawns a codec
 * check) is DELIBERATELY NOT here: it lives in its natural home `./ffmpeg.ts` (where the ffmpeg-gated
 * tests already pay the spawn) and that file self-describes its `ffmpegAbsent` capability export. So
 * importing THIS table never drags the ffmpeg spawn into the wasm/coverage/astro tests. The gate's
 * linker reads the SET of capability modules (this one + `./capabilities.browser.ts` + `./ffmpeg.ts`).
 *
 * @module
 */
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** Repo root, two levels up from `tests/helpers/` — every probe path resolves against it. */
const REPO_ROOT = resolve(import.meta.dirname, '../..');

/** The cargo-built wasm kernel (the `build:wasm` output the parity suite needs). */
const WASM_BUILD_ARTIFACT = join(REPO_ROOT, 'crates/czap-compute/target/wasm32-unknown-unknown/release/czap_compute.wasm');
/** The publish-STAGED wasm copy under `@czap/core/dist` (the module-graph resolver target). */
const WASM_DIST_ARTIFACT = join(REPO_ROOT, 'packages/core/dist/czap-compute.wasm');
/** The built Astro example's entry HTML (the e2e directive-boot fixture). */
const ASTRO_EXAMPLE_INDEX = join(REPO_ROOT, 'tests/integration/astro/dist/index.html');

/** `wasm-absent` — the cargo-built wasm kernel is not present (run `build:wasm`); parity self-skips. */
export const wasmAbsent = !existsSync(WASM_BUILD_ARTIFACT);

/** `wasm-dist-staged` — the wasm is STAGED under `@czap/core/dist` (the resolver test runs only then). */
export const wasmDistStaged = existsSync(WASM_DIST_ARTIFACT);

/** `astro-example-not-built` — the Astro example is not built (`index.html` absent); the e2e self-skips. */
export const astroExampleNotBuilt = !existsSync(ASTRO_EXAMPLE_INDEX);

/** `coverage-instrumentation` — running under V8 coverage; the subprocess-spawning dev test is redundant there. */
export const coverageInstrumentation = process.env.NODE_V8_COVERAGE !== undefined;
