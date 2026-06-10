/**
 * Engine audit policy (CUT D9b-1) — the topology/surface/allowlist data + the
 * structural primitives the three passes consume. This is LiteShip's REFERENCE
 * configuration; a downstream project supplies its own via a DevopsProfile.
 *
 * The LiteShip HICP rubric (section taxonomy, file-class weights, named-offense
 * map, report paths, inventory matchers) is NOT here — it stays repo-local in
 * scripts/audit/policy.ts, which re-exports this module for the engine names.
 *
 * @module
 */
import type { AuditFinding } from './types.js';

export interface AuditAllowlistEntry {
  readonly rule: string;
  readonly filePrefix?: string;
  readonly summaryIncludes?: string;
  readonly reason: string;
}

export interface PackagePolicy {
  readonly allowedInternalImports: readonly string[];
  readonly kind: 'core' | 'layered' | 'host-adjacent' | 'standalone';
}

export const auditSourceGlobs = ['packages/*/src/**/*.ts', 'packages/*/src/**/*.tsx'] as const;

export const auditIgnoreGlobs = [
  '**/dist/**',
  '**/node_modules/**',
  '**/*.d.ts',
  'coverage/**',
  'reports/**',
  'docs/**',
  'examples/**',
  'benchmarks/**',
  'tests/e2e/fixtures/**',
] as const;

export const packageTopology: Record<string, PackagePolicy> = {
  '@czap/core': {
    // @czap/_spine is the canonical type-only spine that core re-anchors
    // its public types from (see packages/core/src/brands.ts and
    // capsule.ts). It compiles to .d.ts only and sits above core in the
    // dependency direction, so this is not a layering violation — it's the
    // intended source of truth for shared brand and content-address types.
    allowedInternalImports: ['@czap/_spine'],
    kind: 'core',
  },
  '@czap/quantizer': {
    allowedInternalImports: ['@czap/core'],
    kind: 'layered',
  },
  '@czap/compiler': {
    // A3b: compiler imports only @czap/core. @czap/quantizer was permitted but
    // never imported or declared, and the architecture DAG (docs/ARCHITECTURE.md)
    // places compiler and quantizer as siblings under core, not a compiler->quantizer
    // edge — so this was permission mold, not a deliberate seam.
    allowedInternalImports: ['@czap/core'],
    kind: 'layered',
  },
  '@czap/web': {
    // CUT A3: web imports only @czap/core; quantizer/compiler were permitted but
    // never imported or declared (removed to make drift loud).
    allowedInternalImports: ['@czap/core'],
    kind: 'layered',
  },
  '@czap/detect': {
    allowedInternalImports: ['@czap/core'],
    kind: 'layered',
  },
  '@czap/edge': {
    allowedInternalImports: ['@czap/core', '@czap/detect'],
    kind: 'host-adjacent',
  },
  '@czap/worker': {
    allowedInternalImports: ['@czap/core'],
    kind: 'host-adjacent',
  },
  '@czap/vite': {
    // CUT A3: vite imports core + compiler; quantizer was permitted but never imported.
    allowedInternalImports: ['@czap/core', '@czap/compiler'],
    kind: 'host-adjacent',
  },
  '@czap/astro': {
    // CUT A3: astro deliberately does NOT depend on @czap/compiler (see the
    // duplicated-predicate note in astro/src/runtime/boundary.ts; CUT A4 routes
    // the shared predicate through @czap/core instead). compiler removed.
    allowedInternalImports: ['@czap/core', '@czap/vite', '@czap/detect', '@czap/edge', '@czap/web', '@czap/worker'],
    kind: 'host-adjacent',
  },
  '@czap/cloudflare': {
    allowedInternalImports: ['@czap/core', '@czap/edge', '@czap/astro'],
    kind: 'host-adjacent',
  },
  '@czap/remotion': {
    allowedInternalImports: ['@czap/core'],
    kind: 'standalone',
  },
  // CUT A2 — topology coverage closure. These five were policy-absent (surfaced
  // by CUT A0's self-trust classification). Each entry reflects the package's
  // actual internal import law today; no product code changed in A2.
  '@czap/scene': {
    // scene composes core primitives and takes a type-only edge to the spine
    // (scene/src/contract.ts imports TrackId/TrackKind from @czap/_spine).
    allowedInternalImports: ['@czap/core', '@czap/_spine'],
    kind: 'layered',
  },
  '@czap/assets': {
    // assets currently imports only core. @czap/_spine is pre-blessed as a
    // type-only edge because CUT A5 will home the shared beat-projection
    // contract in the spine; this is a modeled extension seam, not fantasy.
    allowedInternalImports: ['@czap/core', '@czap/_spine'],
    kind: 'layered',
  },
  '@czap/cli': {
    // Terminal adapter over @czap/command. Imports core, the shared command
    // registry, assets (asset-analyze), and @czap/audit (CUT D9b-2: the CLI is
    // the sole adapter that wires the runAudit capability for `czap audit`). The
    // cli <-> mcp-server relationship is a dynamic import not tracked here.
    allowedInternalImports: ['@czap/core', '@czap/command', '@czap/assets', '@czap/audit'],
    kind: 'host-adjacent',
  },
  '@czap/mcp-server': {
    // Protocol adapter over @czap/command. CUT A1 capstone: tools/list projects
    // the canonical catalog and tools/call dispatches through the shared
    // registry + @czap/command/host context → structuredContent. The mcp->cli
    // edge is GONE (no more stdout capture / dynamic import of @czap/cli).
    // CUT D6: mcp-server → compiler is an allowed acyclic edge — the server feeds
    // its real registries to the pure compiler's compileMcpAppManifest projector
    // (compiler → mcp-server remains forbidden).
    allowedInternalImports: ['@czap/core', '@czap/command', '@czap/compiler'],
    kind: 'host-adjacent',
  },
  '@czap/_spine': {
    // The canonical type-only spine (ADR-0010). It is consumed by other
    // packages as a type-only source and imports no internal package itself.
    allowedInternalImports: [],
    kind: 'standalone',
  },
  liteship: {
    // The umbrella package: manifest-level dependencies on every publishable
    // @czap/* scope, ZERO source imports (a barrel over the host integrations
    // would force their peer expectations on every consumer). Its index ships
    // only the installed-package manifest const.
    allowedInternalImports: [],
    kind: 'standalone',
  },
  '@czap/command': {
    // CUT A1: shared command registry/dispatcher + the @czap/command/host Node
    // execution surface (createNodeCommandContext). Main entry imports @czap/core
    // (the command language, re-anchored from _spine); the /host subpath also
    // imports @czap/assets for the audio-projection DSP the asset.analyze handler
    // runs. Host execution (spawn/ffmpeg/vitest) lives here so CLI and MCP share
    // one factory and mcp-server never imports cli.
    allowedInternalImports: ['@czap/core', '@czap/assets'],
    kind: 'layered',
  },
  '@czap/audit': {
    // CUT D9b-1: the packageable, downstream-installable audit engine. Operates
    // on a repo as a file/AST corpus (typescript + fast-glob) and imports NO
    // internal @czap package — a standalone leaf consumed by @czap/cli (D9b-2)
    // and by downstream projects directly.
    allowedInternalImports: [],
    kind: 'standalone',
  },
};

/**
 * Dynamic package imports — `import('@czap/...')` — that are deliberately
 * allowed despite the importer not declaring the target in its package.json.
 * Format: `"<importer> -> <target>"`. Everything else that dynamic-imports a
 * workspace package absent from its manifest is flagged
 * (`missing-manifest-dependency-dynamic`) so dynamic edges can't smuggle a
 * dependency past the static audit. (CUT A1 — A1-T3.)
 */
export const dynamicImportExemptions: ReadonlySet<string> = new Set([
  // The `czap mcp` verb launches the MCP server via a ONE-WAY dynamic import.
  // @czap/cli deliberately does not declare @czap/mcp-server as a dependency —
  // declaring it (or importing statically) would re-form the cli↔mcp cycle A1
  // deleted. This is the lone sanctioned manifest-absent dynamic edge.
  '@czap/cli -> @czap/mcp-server',
]);

export const surfacePolicy = {
  astroPackage: '@czap/astro',
  astroClientDirectives: ['satellite', 'stream', 'llm', 'worker', 'gpu', 'wasm'] as const,
  // Astro-package-relative (consumer-mode seam): resolved against wherever
  // @czap/astro actually lives — `packages/astro` in the monorepo, a
  // node_modules install downstream. Legacy `packages/`-prefixed entries in
  // external profiles still resolve repo-root-relative.
  astroRuntimeFiles: [
    'src/runtime/satellite.ts',
    'src/runtime/stream.ts',
    'src/runtime/llm.ts',
    'src/runtime/worker.ts',
    'src/runtime/gpu.ts',
    'src/runtime/wasm.ts',
    'src/runtime/boundary.ts',
    'src/runtime/slots.ts',
    'src/runtime/directive-boot.ts',
  ] as const,
  viteVirtualModules: [
    'virtual:czap/tokens',
    'virtual:czap/tokens.css',
    'virtual:czap/boundaries',
    'virtual:czap/themes',
    'virtual:czap/hmr-client',
    'virtual:czap/wasm-url',
  ] as const,
  vitePackage: '@czap/vite',
  viteVirtualModulesFile: 'src/virtual-modules.ts',
  knownCapabilityNotes: [
    {
      file: 'packages/astro/src/runtime/gpu.ts',
      summary:
        'GPU directive currently exposes WebGL2 runtime with an explicit WebGPU/WGSL partial-capability warning path.',
    },
    {
      file: 'packages/vite/src/virtual-modules.ts',
      summary:
        'Virtual modules intentionally ship placeholder stubs that are populated by the Vite transform pipeline.',
    },
  ] as const,
};

export const auditAllowlist: readonly AuditAllowlistEntry[] = [
  {
    rule: 'default-export',
    filePrefix: 'packages/astro/src/client-directives/satellite.ts',
    reason: 'Astro client directives require default exports and this file is an intentionally tiny wrapper.',
  },
  {
    rule: 'default-export',
    filePrefix: 'packages/astro/src/client-directives/stream.ts',
    reason: 'Astro client directives require default exports and this file is an intentionally tiny wrapper.',
  },
  {
    rule: 'default-export',
    filePrefix: 'packages/astro/src/client-directives/llm.ts',
    reason: 'Astro client directives require default exports and this file is an intentionally tiny wrapper.',
  },
  {
    rule: 'default-export',
    filePrefix: 'packages/astro/src/client-directives/worker.ts',
    reason: 'Astro client directives require default exports and this file is an intentionally tiny wrapper.',
  },
  {
    rule: 'default-export',
    filePrefix: 'packages/astro/src/client-directives/gpu.ts',
    reason: 'Astro client directives require default exports and this file is an intentionally tiny wrapper.',
  },
  {
    rule: 'default-export',
    filePrefix: 'packages/astro/src/client-directives/wasm.ts',
    reason: 'Astro client directives require default exports and this file is an intentionally tiny wrapper.',
  },
  {
    rule: 'placeholder-content',
    filePrefix: 'packages/vite/src/virtual-modules.ts',
    reason: 'Virtual module placeholders are documented stubs for bundler/type-checker compatibility.',
  },
  {
    rule: 'missing-runtime-capability',
    filePrefix: 'packages/astro/src/client-directives/gpu.ts',
    summaryIncludes: 'WebGPU',
    reason: 'GPU/WebGPU is an explicitly documented partial capability surface in the first wave.',
  },
  {
    // CUT D9b-1 — the audit engine now lives in a scanned package, so the
    // integrity detector reads its OWN pattern/summary strings (e.g. the
    // "placeholder/debug marker" message it emits). Those are detector copy, not
    // runtime placeholders.
    rule: 'placeholder-content',
    filePrefix: 'packages/audit/src/integrity.ts',
    reason:
      "The integrity detector's own placeholder/debug summary strings — detector copy, not a runtime placeholder.",
  },
  {
    // The audit policy's documented-stub allowlist reason + the vite virtual-module
    // capability note both contain the word "placeholder" describing OTHER files.
    rule: 'placeholder-content',
    filePrefix: 'packages/audit/src/policy.ts',
    reason:
      "The audit policy's own allowlist reason + capability-note strings describe documented stubs elsewhere — not a runtime placeholder here.",
  },
  {
    // CUT A6 — symbol-level orphan: a test-only reset hook. Its only consumer is
    // the runtime-policy test suite, which the audit does not scan, so symbol-level
    // evidence cannot see it. Allowlisted so it classifies as suppressed-with-reason
    // (test-only) rather than appearing as a dead-symbol candidate.
    rule: 'symbol-orphan-candidate',
    filePrefix: 'packages/astro/src/runtime/policy.ts',
    summaryIncludes: '_resetRuntimePolicyForTests',
    reason:
      'Test-only reset hook consumed by the runtime-policy test suite (tests/ are not scanned by the symbol-level audit).',
  },
];

export function normalizeRepoPath(value: string): string {
  return value.replace(/\\/g, '/');
}

export function findAllowlistReason(finding: AuditFinding): string | null {
  const file = finding.location?.file ?? '';
  for (const entry of auditAllowlist) {
    if (entry.rule !== finding.rule) continue;
    if (entry.filePrefix && !file.startsWith(entry.filePrefix)) continue;
    if (entry.summaryIncludes && !finding.summary.includes(entry.summaryIncludes)) continue;
    return entry.reason;
  }
  return null;
}
