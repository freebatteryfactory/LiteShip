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
import { GENERATED_PACKAGE_TOPOLOGY } from './package-topology.generated.js';

export interface AuditAllowlistEntry {
  readonly rule: string;
  /**
   * npm package name owning the allowlisted file. When set, `filePrefix` is
   * PACKAGE-RELATIVE (e.g. `src/client-directives/adaptive.ts`) and matching
   * resolves the finding's file through the profile's discovered package
   * roots — so the same entry suppresses in the monorepo
   * (`packages/astro/...`) and in a consumer install
   * (`node_modules/.pnpm/.../@liteship/astro/...`). Without it, `filePrefix` is
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

export const packageTopology: Record<string, PackagePolicy> = GENERATED_PACKAGE_TOPOLOGY;

/**
 * Foundational packages every internal package may import WITHOUT an explicit
 * `allowedInternalImports` entry — the runtime analogue of how `@liteship/_spine`
 * is the universal type source. `@liteship/error` is the one zero-dependency error
 * algebra the whole monorepo (and downstream consumers) builds failure paths
 * on; threading it through every package's allow-list would be noise that every
 * NEW package must then remember to repeat. Listed here once, the topology
 * check (structure.ts) treats an edge to any of these as always-blessed.
 *
 * Kept deliberately tiny: a package qualifies only if it is a zero-`@liteship`-dep
 * root that is genuinely universal. Adding to this list widens what every
 * package may import unchecked, so it is a conscious architectural decision.
 */
export const foundationalPackages: readonly string[] = ['@liteship/error'];

/**
 * Dynamic package imports — `import('@liteship/...')` — that are deliberately
 * allowed despite the importer not declaring the target in its package.json.
 * Format: `"<importer> -> <target>"`. Everything else that dynamic-imports a
 * workspace package absent from its manifest is flagged
 * (`missing-manifest-dependency-dynamic`) so dynamic edges can't smuggle a
 * dependency past the static audit. (CUT A1 — A1-T3.)
 */
export const dynamicImportExemptions: ReadonlySet<string> = new Set([
  // The `liteship mcp` verb launches the MCP server via a ONE-WAY dynamic import.
  // @liteship/cli deliberately does not declare @liteship/mcp-server as a dependency —
  // declaring it (or importing statically) would re-form the cli↔mcp cycle A1
  // deleted. This is the lone sanctioned manifest-absent dynamic edge.
  '@liteship/cli -> @liteship/mcp-server',
]);

export const surfacePolicy: SurfacePolicyShape = {
  astroPackage: '@liteship/astro',
  astroClientDirectives: ['adaptive', 'stream', 'llm', 'worker', 'gpu', 'wasm'],
  // Astro-package-relative (consumer-mode seam): resolved against wherever
  // @liteship/astro actually lives — `packages/astro` in the monorepo, a
  // node_modules install downstream. Legacy `packages/`-prefixed entries in
  // external profiles still resolve repo-root-relative.
  astroRuntimeFiles: [
    'src/runtime/adaptive.ts',
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
    'virtual:liteship/tokens',
    'virtual:liteship/tokens.css',
    'virtual:liteship/boundaries',
    'virtual:liteship/themes',
    'virtual:liteship/hmr-client',
    'virtual:liteship/wasm-url',
  ],
  vitePackage: '@liteship/vite',
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
    package: '@liteship/astro',
    filePrefix: 'src/client-directives/adaptive.ts',
    reason: 'Astro client directives require default exports and this file is an intentionally tiny wrapper.',
  },
  {
    rule: 'default-export',
    package: '@liteship/astro',
    filePrefix: 'src/client-directives/stream.ts',
    reason: 'Astro client directives require default exports and this file is an intentionally tiny wrapper.',
  },
  {
    rule: 'default-export',
    package: '@liteship/astro',
    filePrefix: 'src/client-directives/llm.ts',
    reason: 'Astro client directives require default exports and this file is an intentionally tiny wrapper.',
  },
  {
    rule: 'default-export',
    package: '@liteship/astro',
    filePrefix: 'src/client-directives/worker.ts',
    reason: 'Astro client directives require default exports and this file is an intentionally tiny wrapper.',
  },
  {
    rule: 'default-export',
    package: '@liteship/astro',
    filePrefix: 'src/client-directives/gpu.ts',
    reason: 'Astro client directives require default exports and this file is an intentionally tiny wrapper.',
  },
  {
    rule: 'default-export',
    package: '@liteship/astro',
    filePrefix: 'src/client-directives/motion.ts',
    reason: 'Astro client directives require default exports and this file is an intentionally tiny wrapper.',
  },
  {
    rule: 'default-export',
    package: '@liteship/astro',
    filePrefix: 'src/client-directives/wasm.ts',
    reason: 'Astro client directives require default exports and this file is an intentionally tiny wrapper.',
  },
  {
    rule: 'default-export',
    package: '@liteship/astro',
    filePrefix: 'src/client-directives/graph.ts',
    reason: 'Astro client directives require default exports and this file is an intentionally tiny wrapper.',
  },
  {
    rule: 'default-export',
    package: '@liteship/astro',
    filePrefix: 'src/client-directives/svg.ts',
    reason: 'Astro client directives require default exports and this file is an intentionally tiny wrapper.',
  },
  {
    rule: 'default-export',
    package: '@liteship/astro',
    filePrefix: 'src/runtime/inspector-toolbar-app.ts',
    reason:
      "Astro's addDevToolbarApp contract requires a default-exported DevToolbarApp entrypoint — the same unavoidable framework contract as the client directives.",
  },
  {
    rule: 'missing-runtime-capability',
    package: '@liteship/astro',
    filePrefix: 'src/client-directives/gpu.ts',
    summaryIncludes: 'WebGPU',
    reason: 'GPU/WebGPU is an explicitly documented partial capability surface in the first wave.',
  },
  {
    // html-trust's Trusted Types policy creation can fail under restrictive
    // CSP (name disallowed, or 'liteship' already defined differently). The null
    // fallback is the DESIGNED signal: assignment proceeds with the raw
    // string, which throws under enforcement and tells the host to install a
    // 'liteship' policy. There is no richer context a browser runtime could
    // surface here without logging (banned by the console-call rule).
    rule: 'fallback-laundering',
    package: '@liteship/web',
    filePrefix: 'src/security/html-trust.ts',
    summaryIncludes: 'returns null',
    reason:
      'Trusted Types policy creation under restrictive CSP: the null fallback deliberately lets enforcement throw, signalling the host to install a liteship policy — designed fail-closed degradation, not laundering.',
  },
  {
    // Workspace guard (Codex P1, PR #3), extracted from doctor.ts to
    // lib/workspace.ts so gauntlet shares it: an unreadable root manifest
    // must read as "not the LiteShip workspace" and refuse workspace verbs.
    // Returning false without context IS the security contract — each
    // caller surfaces the refusal in its own receipt/error.
    rule: 'fallback-laundering',
    package: '@liteship/cli',
    filePrefix: 'src/lib/workspace.ts',
    summaryIncludes: 'returns false',
    reason:
      'Fail-closed workspace guard for doctor --fix and gauntlet: unreadable root manifest must refuse workspace verbs (Codex P1); the refusal is surfaced by each caller, so no context is laundered.',
  },
  {
    // The WASM artifact resolver runs inside a consumer's Vite/Astro BUILD. If
    // @liteship/core (or its wasm) can't be resolved — not installed, predates the
    // artifact, or an unexpected resolver error — it must degrade to null so the
    // build proceeds on the numerically-identical TS fallback. Throwing would
    // crash the consumer's build over an optional perf upgrade. The silent null
    // IS the cheapest-valid-default contract; the absence is observable via the
    // plugin's missing-binary warning, so nothing is laundered.
    rule: 'fallback-laundering',
    package: '@liteship/vite',
    filePrefix: 'src/wasm-package-resolve.ts',
    summaryIncludes: 'returns null',
    reason:
      'Build-time WASM resolver must never throw: any failure to resolve @liteship/core or its wasm degrades to null so the consumer build proceeds on the identical TS fallback; the missing-binary warning surfaces the absence.',
  },
  {
    // gauntlet's failed-phase enrichment reads an OPTIONAL artifact: the
    // docblock pins the degradation contract (absent/corrupt artifact →
    // null → error reports the bare exit status, which is still correct).
    rule: 'fallback-laundering',
    package: '@liteship/cli',
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
    package: '@liteship/core',
    filePrefix: 'src/harness/arbitrary-from-schema.ts',
    summaryIncludes: 'returns false',
    reason:
      'Declaration acceptance probe (_declarationAccepts): a throwing schema parser IS the rejection result (accepted=false); the caught error carries no information beyond the boolean the function returns, so nothing is laundered — the probe result is the contract.',
  },
  {
    // 0.4.0 — isCanonicalCborBytes is an Effect Schema refinement predicate:
    // any decoder/encoder throwable (including non-Error throwables) means the
    // candidate bytes are outside the canonical-CBOR input domain. The false
    // return is the typed schema rejection signal; surfacing the raw throwable
    // would defect the decoder instead of producing a parse failure.
    rule: 'fallback-laundering',
    package: '@liteship/core',
    filePrefix: 'src/authoring/capsules/canonical-cbor-decode.ts',
    summaryIncludes: 'returns false',
    reason:
      'Canonical CBOR schema refinement predicate: any decoder/encoder throwable means the byte array is not canonical input (accepted=false); returning false keeps Effect Schema on its typed parse-failure path instead of leaking defects.',
  },
  {
    // CUT A6 — symbol-level orphan: a test-only reset hook. Its only consumers
    // are the astro directive test suites (tests/unit/astro/astro-directives.test.ts,
    // astro-directive-branches.test.ts), which the audit does not scan, so
    // symbol-level evidence cannot see them. Allowlisted so it classifies as
    // suppressed-with-reason (test-only) rather than appearing as a dead-symbol
    // candidate.
    rule: 'symbol-orphan-candidate',
    package: '@liteship/astro',
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
    package: '@liteship/web',
    filePrefix: 'src/security/html-trust.ts',
    summaryIncludes: '_resetTrustedTypesPolicyCacheForTests',
    reason:
      'Test-only Trusted Types cache reset consumed by tests/unit/web/runtime-security-helpers.test.ts beforeEach/afterEach (tests/ are not scanned by the symbol-level audit).',
  },
];

// B5b one-normalizer cage — the LEAN-AUDIT home. This one-liner is a PARITY COPY
// of the browser-safe core `path-normalize` leaf (Wave 7 S7.1): the two are
// byte-identical and drift-guarded (b5-normalize-repo-path.test.ts parity assert),
// but they must stay SEPARATE implementations because D9b forbids @liteship/audit from
// importing the heavy core runtime (audit stays downstream-installable), and B5b
// forbids the core package from importing @liteship/audit. The cli's pinned
// `normalizeRepoPath` import off @liteship/audit resolves here; browser/core consumers
// import the parity twin out of the core barrel.
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
