/**
 * The package-smoke roster (relocated from `scripts/package-smoke.ts`, CUT A5).
 * Pure data — no Node edge — so it can be projected by the meta-test
 * (`tests/unit/devops/package-smoke-roster.test.ts`) AND consumed by the CLI-only
 * smoke engine (`runPackageSmokeScan` in `@czap/cli`) without either reaching into
 * a self-executing script.
 *
 * `PACKAGES` mirrors every publishable `@czap/*` scope under `packages/*` (see
 * `pnpm-workspace.yaml`); `imports` is the set of module specifiers the
 * import-smoke resolves for that package. `PEER_INSTALLS` is the external peer
 * set the consumer fixture installs alongside the packed tarballs. The B6a guard
 * derives the publishable set from the manifests on disk and asserts this roster
 * covers exactly that set — so the release gate can never silently skip a
 * newly-published package.
 *
 * @module
 */

/** One publishable scope: its `packages/<dir>`, its package name, and the module specifiers the import-smoke resolves. */
export interface PackageSmokeSpec {
  readonly dir: string;
  readonly name: string;
  readonly imports: readonly string[];
}

/** Mirrors every publishable `@czap/*` scope under `packages/*` (see `pnpm-workspace.yaml`). */
export const PACKAGES: readonly PackageSmokeSpec[] = [
  // _spine is type-only (no runtime); packed and overridden so consumers
  // can resolve `@czap/core`'s and `@czap/scene`'s declared dep on it
  // during `pnpm install`. No runtime `import()` smoke needed.
  { dir: 'packages/_spine', name: '@czap/_spine', imports: [] },
  // @czap/error is the foundational zero-dep error algebra — every package's
  // runtime dep; packed first so consumers resolve the declared workspace edge.
  { dir: 'packages/error', name: '@czap/error', imports: ['@czap/error'] },
  { dir: 'packages/gauntlet', name: '@czap/gauntlet', imports: ['@czap/gauntlet'] },
  { dir: 'packages/canonical', name: '@czap/canonical', imports: ['@czap/canonical'] },
  { dir: 'packages/genui', name: '@czap/genui', imports: ['@czap/genui'] },
  { dir: 'packages/core', name: '@czap/core', imports: ['@czap/core', '@czap/core/testing', '@czap/core/harness'] },
  { dir: 'packages/quantizer', name: '@czap/quantizer', imports: ['@czap/quantizer', '@czap/quantizer/testing'] },
  { dir: 'packages/compiler', name: '@czap/compiler', imports: ['@czap/compiler'] },
  { dir: 'packages/web', name: '@czap/web', imports: ['@czap/web', '@czap/web/lite'] },
  { dir: 'packages/detect', name: '@czap/detect', imports: ['@czap/detect'] },
  { dir: 'packages/edge', name: '@czap/edge', imports: ['@czap/edge'] },
  { dir: 'packages/cloudflare', name: '@czap/cloudflare', imports: ['@czap/cloudflare', '@czap/cloudflare/testing'] },
  { dir: 'packages/worker', name: '@czap/worker', imports: ['@czap/worker'] },
  { dir: 'packages/vite', name: '@czap/vite', imports: ['@czap/vite', '@czap/vite/html-transform'] },
  {
    dir: 'packages/astro',
    name: '@czap/astro',
    imports: [
      '@czap/astro',
      '@czap/astro/client-directives/satellite',
      '@czap/astro/client-directives/stream',
      '@czap/astro/client-directives/llm',
      '@czap/astro/client-directives/worker',
      '@czap/astro/client-directives/gpu',
      '@czap/astro/client-directives/wasm',
      '@czap/astro/middleware',
      '@czap/astro/runtime',
    ],
  },
  { dir: 'packages/remotion', name: '@czap/remotion', imports: ['@czap/remotion'] },
  { dir: 'packages/scene', name: '@czap/scene', imports: ['@czap/scene', '@czap/scene/dev'] },
  // The verb / orchestration layer (P4). `.` is the pure graph-walk core;
  // `./ffmpeg` is the node-only headless byte-encode backend (child_process).
  { dir: 'packages/stage', name: '@czap/stage', imports: ['@czap/stage', '@czap/stage/ffmpeg'] },
  { dir: 'packages/assets', name: '@czap/assets', imports: ['@czap/assets', '@czap/assets/testing'] },
  { dir: 'packages/audit', name: '@czap/audit', imports: ['@czap/audit'] },
  // Shared command registry (CUT A1) — the dispatch layer @czap/cli and
  // @czap/mcp-server both consume. `./host` carries the Node-only manifest helpers.
  { dir: 'packages/command', name: '@czap/command', imports: ['@czap/command', '@czap/command/host'] },
  { dir: 'packages/cli', name: '@czap/cli', imports: ['@czap/cli'] },
  { dir: 'packages/mcp-server', name: '@czap/mcp-server', imports: ['@czap/mcp-server'] },
  // The unscoped scaffolder — consumed via `npm create liteship` (bin), but
  // its main entry exports the scaffold function; smoke verifies it resolves.
  { dir: 'packages/create-liteship', name: 'create-liteship', imports: ['create-liteship'] },
  // The unscoped umbrella — manifest-level deps on every @czap/* scope,
  // zero source imports; smoke verifies its own entrypoint resolves.
  { dir: 'packages/liteship', name: 'liteship', imports: ['liteship'] },
];

/** External peer set the consumer fixture installs alongside the packed `@czap/*` tarballs. */
export const PEER_INSTALLS: readonly string[] = [
  'effect@4.0.0-beta.32',
  'vite@8.0.0',
  'astro@6.0.0',
  'react@19.2.0',
  'react-dom@19.2.0',
  'remotion@4.0.440',
  'fast-check@4.7.0',
  // @czap/audit's runtime deps — the engine parses + globs the target repo.
  'typescript@5.9.3',
  'fast-glob@3.3.3',
];
