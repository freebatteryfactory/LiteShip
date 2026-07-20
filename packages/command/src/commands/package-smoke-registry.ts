/**
 * The package-smoke roster (relocated from `scripts/package-smoke.ts`, CUT A5).
 * Pure data — no Node edge — so it can be projected by the meta-test
 * (`tests/unit/devops/package-smoke-roster.test.ts`) AND consumed by the CLI-only
 * smoke engine (`runPackageSmokeScan` in `@liteship/cli`) without either reaching into
 * a self-executing script.
 *
 * `PACKAGES` mirrors every publishable `@liteship/*` scope under `packages/*` (see
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

/**
 * Mirrors every publishable scope under `packages/*` (see `pnpm-workspace.yaml`).
 *
 * The MEMBERSHIP of this roster (the `name` set) is owned by
 * `scripts/gen-roster.ts` (`PUBLISHABLE_ROSTER` = the `@liteship/*` fleet plus the
 * `create-liteship` / `liteship` umbrellas). This copy stays local — and keeps
 * its hand-authored `imports` / `dir` fields — because `@liteship/command` sits below
 * the devops layer and cannot import the generator; parity with the canonical
 * roster is enforced by the `package-smoke-roster` drift-guard, which asserts
 * these names equal gen-roster's `PUBLISHABLE_ROSTER`.
 *
 * The `@liteship/*` subset of these names (and their dependency ORDER) is likewise the
 * [DUP] province of `@liteship/audit`'s `LITESHIP_PACKAGE_ROSTER`, the canonical owner. This
 * copy stays local by the SAME layering — `@liteship/command` cannot depend on the
 * devops-layer `@liteship/audit` — and its parity is held by the `package-smoke-roster`
 * drift-guard, not a shared import.
 */
export const PACKAGES: readonly PackageSmokeSpec[] = [
  // _spine is type-only (no runtime); packed and overridden so consumers
  // can resolve `@liteship/core`'s and `@liteship/scene`'s declared dep on it
  // during `pnpm install`. No runtime `import()` smoke needed.
  { dir: 'packages/_spine', name: '@liteship/_spine', imports: [] },
  // @liteship/error is the foundational zero-dep error algebra — every package's
  // runtime dep; packed first so consumers resolve the declared workspace edge.
  { dir: 'packages/error', name: '@liteship/error', imports: ['@liteship/error'] },
  { dir: 'packages/gauntlet', name: '@liteship/gauntlet', imports: ['@liteship/gauntlet'] },
  { dir: 'packages/canonical', name: '@liteship/canonical', imports: ['@liteship/canonical'] },
  { dir: 'packages/genui', name: '@liteship/genui', imports: ['@liteship/genui'] },
  {
    dir: 'packages/core',
    name: '@liteship/core',
    imports: ['@liteship/core', '@liteship/core/testing', '@liteship/core/harness'],
  },
  {
    dir: 'packages/quantizer',
    name: '@liteship/quantizer',
    imports: ['@liteship/quantizer', '@liteship/quantizer/testing'],
  },
  { dir: 'packages/compiler', name: '@liteship/compiler', imports: ['@liteship/compiler'] },
  { dir: 'packages/web', name: '@liteship/web', imports: ['@liteship/web', '@liteship/web/lite'] },
  { dir: 'packages/detect', name: '@liteship/detect', imports: ['@liteship/detect'] },
  { dir: 'packages/edge', name: '@liteship/edge', imports: ['@liteship/edge'] },
  {
    dir: 'packages/cloudflare',
    name: '@liteship/cloudflare',
    imports: ['@liteship/cloudflare', '@liteship/cloudflare/testing', '@liteship/cloudflare/cache-provider'],
  },
  { dir: 'packages/worker', name: '@liteship/worker', imports: ['@liteship/worker'] },
  { dir: 'packages/vite', name: '@liteship/vite', imports: ['@liteship/vite', '@liteship/vite/html-transform'] },
  {
    dir: 'packages/astro',
    name: '@liteship/astro',
    imports: [
      '@liteship/astro',
      '@liteship/astro/client-directives/adaptive',
      '@liteship/astro/client-directives/stream',
      '@liteship/astro/client-directives/llm',
      '@liteship/astro/client-directives/worker',
      '@liteship/astro/client-directives/gpu',
      '@liteship/astro/client-directives/wasm',
      '@liteship/astro/middleware',
      '@liteship/astro/fetch-layer',
      '@liteship/astro/runtime',
    ],
  },
  { dir: 'packages/remotion', name: '@liteship/remotion', imports: ['@liteship/remotion'] },
  { dir: 'packages/scene', name: '@liteship/scene', imports: ['@liteship/scene', '@liteship/scene/dev'] },
  // The verb / orchestration layer (P4). `.` is the pure graph-walk core;
  // `./ffmpeg` is the node-only headless byte-encode backend (child_process).
  { dir: 'packages/stage', name: '@liteship/stage', imports: ['@liteship/stage', '@liteship/stage/ffmpeg'] },
  { dir: 'packages/assets', name: '@liteship/assets', imports: ['@liteship/assets'] },
  { dir: 'packages/audit', name: '@liteship/audit', imports: ['@liteship/audit'] },
  // Shared command registry (CUT A1) — the dispatch layer @liteship/cli and
  // @liteship/mcp-server both consume. `./host` carries the Node-only manifest helpers.
  { dir: 'packages/command', name: '@liteship/command', imports: ['@liteship/command', '@liteship/command/host'] },
  { dir: 'packages/cli', name: '@liteship/cli', imports: ['@liteship/cli'] },
  { dir: 'packages/mcp-server', name: '@liteship/mcp-server', imports: ['@liteship/mcp-server'] },
  // The unscoped scaffolder — consumed via `npm create liteship` (bin), but
  // its main entry exports the scaffold function; smoke verifies it resolves.
  { dir: 'packages/create-liteship', name: 'create-liteship', imports: ['create-liteship'] },
  // The unscoped umbrella — manifest-level deps on every @liteship/* scope,
  // zero source imports; smoke verifies its own entrypoint resolves.
  { dir: 'packages/liteship', name: 'liteship', imports: ['liteship'] },
];

/** External peer set the consumer fixture installs alongside the packed `@liteship/*` tarballs. */
export const PEER_INSTALLS: readonly string[] = [
  'effect@4.0.0-beta.32',
  // vite must be >= 8.1.0: astro@7 depends on esbuild ^0.28, and vite@8.0.0
  // peered esbuild ^0.27.0 only (→ strict-peer install failure in the smoke
  // consumer). vite@8.1.0 widened the peer to `^0.27.0 || ^0.28.0`.
  'vite@8.1.0',
  // Must satisfy @liteship/astro's `astro >=7.0.0 <8` peer (a stale `astro@6.0.0`
  // here failed the consumer install under strict-peer once we hard-cut to 7).
  'astro@7.0.0',
  'react@19.2.0',
  'react-dom@19.2.0',
  'remotion@4.0.440',
  'fast-check@4.7.0',
  // @liteship/audit's runtime deps — the engine parses + globs the target repo.
  'typescript@5.9.3',
  'fast-glob@3.3.3',
];
