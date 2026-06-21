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
import type { SurfacePolicyShape } from './devops-profile.js';

export interface AuditAllowlistEntry {
  readonly rule: string;
  /**
   * npm package name owning the allowlisted file. When set, `filePrefix` is
   * PACKAGE-RELATIVE (e.g. `src/client-directives/satellite.ts`) and matching
   * resolves the finding's file through the profile's discovered package
   * roots — so the same entry suppresses in the monorepo
   * (`packages/astro/...`) and in a consumer install
   * (`node_modules/.pnpm/.../@czap/astro/...`). Without it, `filePrefix` is
   * matched against the repo-root-relative finding path verbatim.
   */
  readonly package?: string;
  readonly filePrefix?: string;
  readonly summaryIncludes?: string;
  readonly reason: string;
}

/** A finding file resolved to its owning package + package-relative path. */
export interface PackagePathResolution {
  readonly packageName: string;
  readonly packageRelativePath: string;
}

export type PackagePathResolver = (file: string) => PackagePathResolution | null;

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
  '@czap/canonical': {
    // Self-contained bytes kernel (ADR-0013): sole third-party dep @noble/hashes.
    // Imports the foundational @czap/error algebra (layering-exempt — see
    // foundationalPackages below); no other internal @czap imports.
    allowedInternalImports: [],
    kind: 'standalone',
  },
  '@czap/genui': {
    // Host catalog renderer (ADR-0014): canonical for stable hashes; spine for GenUI types.
    allowedInternalImports: ['@czap/canonical', '@czap/_spine'],
    kind: 'layered',
  },
  '@czap/core': {
    // @czap/_spine is the canonical type-only spine that core re-anchors
    // its public types from (see packages/core/src/brands.ts and
    // capsule.ts). It compiles to .d.ts only and sits above core in the
    // dependency direction, so this is not a layering violation — it's the
    // intended source of truth for shared brand and content-address types.
    // @czap/canonical is the sync bytes implementation core re-exports (ADR-0013).
    allowedInternalImports: ['@czap/_spine', '@czap/canonical'],
    kind: 'core',
  },
  '@czap/quantizer': {
    allowedInternalImports: ['@czap/core'],
    kind: 'layered',
  },
  '@czap/compiler': {
    // A3b: compiler imports only @czap/core. @czap/quantizer was permitted but
    // never imported or declared, and the architecture DAG (ARCHITECTURE.md)
    // places compiler and quantizer as siblings under core, not a compiler->quantizer
    // edge — so this was permission mold, not a deliberate seam.
    allowedInternalImports: ['@czap/core'],
    kind: 'layered',
  },
  '@czap/web': {
    // CUT A3: web imports only @czap/core; quantizer/compiler were permitted but
    // never imported or declared (removed to make drift loud).
    // @czap/genui: re-exports tryParseGeneratedUIChunk for the LLM chunk seam.
    allowedInternalImports: ['@czap/core', '@czap/genui'],
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
    // edge added for the boundary-manifest contract (ADR-0003 build-to-edge
    // handoff): the build derives BoundaryManifest entries (tier grid +
    // CompiledOutputs types live in @czap/edge) that edge hosts consume.
    allowedInternalImports: ['@czap/core', '@czap/compiler', '@czap/edge'],
    kind: 'host-adjacent',
  },
  '@czap/astro': {
    // CUT A3: astro deliberately does NOT depend on @czap/compiler (see the
    // duplicated-predicate note in astro/src/runtime/boundary.ts; CUT A4 routes
    // the shared predicate through @czap/core instead). compiler removed.
    allowedInternalImports: [
      '@czap/core',
      '@czap/vite',
      '@czap/detect',
      '@czap/edge',
      '@czap/web',
      '@czap/worker',
      '@czap/genui',
      // 0.4.0: the SVG last-mile directive + the scene→live bridge reuse the live
      // SVG egress / scene runtime. Acyclic — @czap/scene depends only on _spine + core.
      '@czap/scene',
    ],
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
  '@czap/stage': {
    // The verb / orchestration layer (P4). Casts ONE DocumentGraph to many
    // carriers by reusing the existing casters: core (graph kernel + Compositor
    // + VideoRenderer), compiler (CSSCompiler), astro (satellite SSR helpers),
    // and web (the captureVideo codec seam). It mints no identity kernel of its
    // own — every address routes through @czap/core's CanonicalCbor/AddressedDigest.
    allowedInternalImports: ['@czap/core', '@czap/compiler', '@czap/astro', '@czap/web'],
    kind: 'host-adjacent',
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
    // Slice B (B1): @czap/gauntlet — the CLI is the HOST that builds the repo-IR
    // (via @czap/audit) and injects it into litelaunchGauntlet, keeping the lean
    // @czap/command/MCP check path IR-free. A direct edge to the standalone
    // gauntlet leaf (no cycle).
    allowedInternalImports: ['@czap/core', '@czap/command', '@czap/assets', '@czap/audit', '@czap/gauntlet'],
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
    allowedInternalImports: ['@czap/core', '@czap/command', '@czap/compiler', '@czap/genui'],
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
    // The `check` command wraps the PURE gauntlet engine fold
    // (litelaunchGauntlet), so the host surface also imports @czap/gauntlet —
    // a one-way edge to a standalone leaf (the gauntlet imports only
    // @czap/error, so no cycle), blessed here.
    allowedInternalImports: ['@czap/core', '@czap/assets', '@czap/gauntlet'],
    kind: 'layered',
  },
  '@czap/audit': {
    // CUT D9b-1: the packageable, downstream-installable audit engine. Operates
    // on a repo as a file/AST corpus (typescript + fast-glob). Imports the
    // foundational @czap/error algebra (layering-exempt, see foundationalPackages).
    // Slice B (B1): audit is the HOST that materializes the gauntlet's RepoIR
    // (buildRepoIR) — it imports @czap/gauntlet (the lean engine DEFINES the
    // RepoIR interface; audit BUILDS it) and @czap/canonical (the blake3 content
    // -address kernel for per-file digests). Both are standalone leaves, so the
    // audit → gauntlet / audit → canonical edges are acyclic (gauntlet deps only
    // @czap/error + fast-glob; canonical deps only @czap/error + @noble/hashes).
    allowedInternalImports: ['@czap/canonical', '@czap/gauntlet'],
    kind: 'standalone',
  },
  '@czap/gauntlet': {
    // The rigor engine (Slice A foundations). A standalone, downstream-installable
    // leaf: Findings + assurance levels + the gate plugin contract + authority
    // ratchet. Imports only the foundational @czap/error algebra (layering-exempt).
    allowedInternalImports: [],
    kind: 'standalone',
  },
};

/**
 * Foundational packages every internal package may import WITHOUT an explicit
 * `allowedInternalImports` entry — the runtime analogue of how `@czap/_spine`
 * is the universal type source. `@czap/error` is the one zero-dependency error
 * algebra the whole monorepo (and downstream consumers) builds failure paths
 * on; threading it through every package's allow-list would be noise that every
 * NEW package must then remember to repeat. Listed here once, the topology
 * check (structure.ts) treats an edge to any of these as always-blessed.
 *
 * Kept deliberately tiny: a package qualifies only if it is a zero-`@czap`-dep
 * root that is genuinely universal. Adding to this list widens what every
 * package may import unchecked, so it is a conscious architectural decision.
 */
export const foundationalPackages: readonly string[] = ['@czap/error'];

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

export const surfacePolicy: SurfacePolicyShape = {
  astroPackage: '@czap/astro',
  astroClientDirectives: ['satellite', 'stream', 'llm', 'worker', 'gpu', 'wasm'],
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
  ],
  viteVirtualModules: [
    'virtual:czap/tokens',
    'virtual:czap/tokens.css',
    'virtual:czap/boundaries',
    'virtual:czap/themes',
    'virtual:czap/hmr-client',
    'virtual:czap/wasm-url',
  ],
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
  ],
};

export const auditAllowlist: readonly AuditAllowlistEntry[] = [
  {
    rule: 'default-export',
    package: '@czap/astro',
    filePrefix: 'src/client-directives/satellite.ts',
    reason: 'Astro client directives require default exports and this file is an intentionally tiny wrapper.',
  },
  {
    rule: 'default-export',
    package: '@czap/astro',
    filePrefix: 'src/client-directives/stream.ts',
    reason: 'Astro client directives require default exports and this file is an intentionally tiny wrapper.',
  },
  {
    rule: 'default-export',
    package: '@czap/astro',
    filePrefix: 'src/client-directives/llm.ts',
    reason: 'Astro client directives require default exports and this file is an intentionally tiny wrapper.',
  },
  {
    rule: 'default-export',
    package: '@czap/astro',
    filePrefix: 'src/client-directives/worker.ts',
    reason: 'Astro client directives require default exports and this file is an intentionally tiny wrapper.',
  },
  {
    rule: 'default-export',
    package: '@czap/astro',
    filePrefix: 'src/client-directives/gpu.ts',
    reason: 'Astro client directives require default exports and this file is an intentionally tiny wrapper.',
  },
  {
    rule: 'default-export',
    package: '@czap/astro',
    filePrefix: 'src/client-directives/wasm.ts',
    reason: 'Astro client directives require default exports and this file is an intentionally tiny wrapper.',
  },
  {
    rule: 'default-export',
    package: '@czap/astro',
    filePrefix: 'src/client-directives/graph.ts',
    reason: 'Astro client directives require default exports and this file is an intentionally tiny wrapper.',
  },
  {
    rule: 'default-export',
    package: '@czap/astro',
    filePrefix: 'src/client-directives/svg.ts',
    reason: 'Astro client directives require default exports and this file is an intentionally tiny wrapper.',
  },
  {
    rule: 'default-export',
    package: '@czap/astro',
    filePrefix: 'src/runtime/inspector-toolbar-app.ts',
    reason:
      "Astro's addDevToolbarApp contract requires a default-exported DevToolbarApp entrypoint — the same unavoidable framework contract as the client directives.",
  },
  {
    rule: 'missing-runtime-capability',
    package: '@czap/astro',
    filePrefix: 'src/client-directives/gpu.ts',
    summaryIncludes: 'WebGPU',
    reason: 'GPU/WebGPU is an explicitly documented partial capability surface in the first wave.',
  },
  {
    // html-trust's Trusted Types policy creation can fail under restrictive
    // CSP (name disallowed, or 'czap' already defined differently). The null
    // fallback is the DESIGNED signal: assignment proceeds with the raw
    // string, which throws under enforcement and tells the host to install a
    // 'czap' policy. There is no richer context a browser runtime could
    // surface here without logging (banned by the console-call rule).
    rule: 'fallback-laundering',
    package: '@czap/web',
    filePrefix: 'src/security/html-trust.ts',
    summaryIncludes: 'returns null',
    reason:
      'Trusted Types policy creation under restrictive CSP: the null fallback deliberately lets enforcement throw, signalling the host to install a czap policy — designed fail-closed degradation, not laundering.',
  },
  {
    // Workspace guard (Codex P1, PR #3), extracted from doctor.ts to
    // lib/workspace.ts so gauntlet shares it: an unreadable root manifest
    // must read as "not the LiteShip workspace" and refuse workspace verbs.
    // Returning false without context IS the security contract — each
    // caller surfaces the refusal in its own receipt/error.
    rule: 'fallback-laundering',
    package: '@czap/cli',
    filePrefix: 'src/lib/workspace.ts',
    summaryIncludes: 'returns false',
    reason:
      'Fail-closed workspace guard for doctor --fix and gauntlet: unreadable root manifest must refuse workspace verbs (Codex P1); the refusal is surfaced by each caller, so no context is laundered.',
  },
  {
    // The WASM artifact resolver runs inside a consumer's Vite/Astro BUILD. If
    // @czap/core (or its wasm) can't be resolved — not installed, predates the
    // artifact, or an unexpected resolver error — it must degrade to null so the
    // build proceeds on the numerically-identical TS fallback. Throwing would
    // crash the consumer's build over an optional perf upgrade. The silent null
    // IS the cheapest-valid-default contract; the absence is observable via the
    // plugin's missing-binary warning, so nothing is laundered.
    rule: 'fallback-laundering',
    package: '@czap/vite',
    filePrefix: 'src/wasm-package-resolve.ts',
    summaryIncludes: 'returns null',
    reason:
      'Build-time WASM resolver must never throw: any failure to resolve @czap/core or its wasm degrades to null so the consumer build proceeds on the identical TS fallback; the missing-binary warning surfaces the absence.',
  },
  {
    // gauntlet's failed-phase enrichment reads an OPTIONAL artifact: the
    // docblock pins the degradation contract (absent/corrupt artifact →
    // null → error reports the bare exit status, which is still correct).
    rule: 'fallback-laundering',
    package: '@czap/cli',
    filePrefix: 'src/commands/gauntlet.ts',
    summaryIncludes: 'returns null',
    reason:
      'readFailedPhase enriches a gauntlet failure from an optional timings artifact; a corrupt artifact degrades to the bare exit status by design — the failure itself is never swallowed.',
  },
  {
    // 0.4.0 — _declarationAccepts is a boolean acceptance PROBE: it runs an
    // Effect schema parser against a sentinel value to detect un-annotated
    // `Schema.instanceOf(Ctor)` forms (which carry no typeConstructor annotation).
    // A parser that THROWS is exactly the rejection signal — the caught error
    // carries no information beyond accepted=false, which is the function's whole
    // contract. There is nothing to surface; consuming the binding would be noise.
    rule: 'fallback-laundering',
    package: '@czap/core',
    filePrefix: 'src/harness/arbitrary-from-schema.ts',
    summaryIncludes: 'returns false',
    reason:
      'Declaration acceptance probe (_declarationAccepts): a throwing schema parser IS the rejection result (accepted=false); the caught error carries no information beyond the boolean the function returns, so nothing is laundered — the probe result is the contract.',
  },
  {
    // CUT A6 — symbol-level orphan: a test-only reset hook. Its only consumers
    // are the astro directive test suites (tests/unit/astro/astro-directives.test.ts,
    // astro-directive-branches.test.ts), which the audit does not scan, so
    // symbol-level evidence cannot see them. Allowlisted so it classifies as
    // suppressed-with-reason (test-only) rather than appearing as a dead-symbol
    // candidate.
    rule: 'symbol-orphan-candidate',
    package: '@czap/astro',
    filePrefix: 'src/runtime/policy.ts',
    summaryIncludes: '_resetRuntimePolicyForTests',
    reason:
      'Test-only reset hook consumed by the astro directive test suites — beforeEach/afterEach in tests/unit/astro/astro-directives.test.ts and astro-directive-branches.test.ts (tests/ are not scanned by the symbol-level audit).',
  },
  {
    // Sibling test-only reset hook for the Trusted Types policy cache. Consumed
    // by tests/unit/web/runtime-security-helpers.test.ts beforeEach/afterEach,
    // which the symbol-level audit does not scan.
    rule: 'symbol-orphan-candidate',
    package: '@czap/web',
    filePrefix: 'src/security/html-trust.ts',
    summaryIncludes: '_resetTrustedTypesPolicyCacheForTests',
    reason:
      'Test-only Trusted Types cache reset consumed by tests/unit/web/runtime-security-helpers.test.ts beforeEach/afterEach (tests/ are not scanned by the symbol-level audit).',
  },
];

export function normalizeRepoPath(value: string): string {
  return value.replace(/\\/g, '/');
}

/**
 * Match a finding against the allowlist. Entries carrying `package` need
 * `resolvePackagePath` to map the finding's repo-relative file to its owning
 * package — without a resolver those entries can never match (consumer-mode
 * findings live under node_modules paths the repo-relative prefixes can't
 * reach, which is exactly the bug package-relative entries fix).
 */
export function findAllowlistReason(finding: AuditFinding, resolvePackagePath?: PackagePathResolver): string | null {
  const file = finding.location?.file ?? '';
  const resolved = resolvePackagePath?.(file) ?? null;
  for (const entry of auditAllowlist) {
    if (entry.rule !== finding.rule) continue;
    if (entry.package !== undefined) {
      if (resolved === null || resolved.packageName !== entry.package) continue;
      if (entry.filePrefix && !resolved.packageRelativePath.startsWith(entry.filePrefix)) continue;
    } else if (entry.filePrefix && !file.startsWith(entry.filePrefix)) {
      continue;
    }
    if (entry.summaryIncludes && !finding.summary.includes(entry.summaryIncludes)) continue;
    return entry.reason;
  }
  return null;
}
