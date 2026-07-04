/**
 * Spine conformance — runtime existence + type-level structural checks.
 *
 * Bang 2: full checks including @czap/_spine type imports.
 *
 * Coverage ledger for `packages/_spine/{core,design,edge}.d.ts`:
 * - Bidirectional runtime pins in this file:
 *   core: CompositeState, VideoConfig, CaptureResult, CapSet.
 *   design: Token.Shape, Theme.Shape, Style.Shape.
 *   edge: ClientHintsHeaders, EdgeTierResult, KVNamespace, CompiledOutputs,
 *   CompiledGLSLOutput, CompiledWGSLOutput, BoundaryCache, TierKey,
 *   BoundaryManifestEntry, BoundaryManifest, BoundaryManifestFile,
 *   ThemeCompileConfig, ThemeCompileResult, EdgeHostContext,
 *   EdgeHostCompileContext, EdgeHostCacheTags, EdgeHostBoundaryConfig,
 *   EdgeHostCacheConfig, EdgeHostCacheStatus, EdgeHostBoundaryResolution,
 *   EdgeHostAdapterConfig, EdgeHostResolution, EdgeHostAdapter.
 * - Runtime existence pins in this file cover value namespaces/functions:
 *   Config, defineConfig, Boundary, resolvePrimitive, plugin, dispatch.
 * - Type-utility / brand-only coverage:
 *   Prettify is shape-equality pinned below; branded scalars are exercised through
 *   the bidirectional structs above (ContentAddress, Millis, CapTier). The unsafe
 *   spine-only `brand` helper intentionally has no public runtime twin.
 * - Out of this file by existing contract: worker and beats mirrors have their own
 *   package contract tests and are not part of this ROADMAP nit.
 */

import { describe, test, expect } from 'vitest';
import type * as SpineCore from '@czap/_spine';
import * as CoreImpl from '@czap/core';
import * as ViteImpl from '@czap/vite';
import * as CompilerImpl from '@czap/compiler';
import type * as EdgePublic from '@czap/edge';

// Runtime truth — the @czap/core types whose hand-authored mirror lives in
// `packages/_spine/core.d.ts`. Imported from the producing modules DIRECTLY (not
// only via the package index) so the guarded surface is exactly the runtime types.
import type { CompositeState as RtCompositeState } from '../../packages/core/src/compositor.js';
import type { VideoConfig as RtVideoConfig } from '../../packages/core/src/video.js';
import type { CaptureResult as RtCaptureResult } from '../../packages/core/src/capture.js';
import type {
  BoundaryCache as RtBoundaryCache,
  CompiledGLSLOutput as RtCompiledGLSLOutput,
  CompiledOutputs as RtEdgeCompiledOutputs,
  CompiledWGSLOutput as RtCompiledWGSLOutput,
  KVNamespace as RtKVNamespace,
} from '../../packages/edge/src/kv-cache.js';
import type {
  BoundaryManifest as RtBoundaryManifest,
  BoundaryManifestEntry as RtBoundaryManifestEntry,
  BoundaryManifestFile as RtBoundaryManifestFile,
  TierKey as RtTierKey,
} from '../../packages/edge/src/manifest.js';

// Runtime truth for the @czap/design SPINE mirror (`packages/_spine/design.d.ts`).
// The runtime `TokenDef`/`ThemeDef`/`StyleDef` interfaces are not exported by name;
// they are re-exported as the `Token`/`Theme`/`Style` namespaces' `Shape` member from
// their producing modules. Imported directly (not via the package index) so the
// guarded surface is exactly the runtime types.
import type { Token as RtToken } from '../../packages/core/src/token.js';
import type { Theme as RtTheme } from '../../packages/core/src/theme.js';
import type { Style as RtStyle } from '../../packages/core/src/style.js';
import type { CapSet as RtCapSet } from '../../packages/core/src/caps.js';

type IsEqual<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? (<T>() => T extends B ? 1 : 2) extends <T>() => T extends A ? 1 : 2
      ? true
      : false
    : false;
type Assert<T extends true> = T;

type _prettifyCoverage = Assert<IsEqual<SpineCore.Prettify<{ readonly a: 1 } & { readonly b: 2 }>, { readonly a: 1; readonly b: 2 }>>;
void (0 as unknown as _prettifyCoverage);

// ─────────────────────────────────────────────────────────────────────────────
// Type-level conformance: the @czap/core SPINE mirror (`core.d.ts`) and the
// @czap/core RUNTIME must stay structurally identical. `packages/_spine/core.d.ts`
// is a hand-authored mirror the runtime never re-imports (ADR-0010), so nothing
// keeps the two honest except this guard.
//
// The proof is BIDIRECTIONAL structural assignability (spine → runtime AND runtime
// → spine) for every load-bearing core type. A bidirectional assignment of two
// named shapes proves they are structurally identical, so a field added/removed on
// either end — or a brand applied on one side but not the other (e.g.
// `VideoConfig.durationMs: Millis`, `CaptureResult.durationMs: Millis`, the `wgsl`
// output channel) — fails one direction and breaks the typecheck.
//
// These assignments are enforced via tsconfig.tests.json (this file is in its
// `include`), so a future divergence fails `pnpm run typecheck`. The assertions
// live inside `__coreSpineTypeContract`, a function that is NEVER called — its body
// is fully typechecked while nothing executes at runtime.
// ─────────────────────────────────────────────────────────────────────────────

function __coreSpineTypeContract(
  aCompositeState: SpineCore.CompositeState,
  bCompositeState: RtCompositeState,
  aVideoConfig: SpineCore.VideoConfig,
  bVideoConfig: RtVideoConfig,
  aCaptureResult: SpineCore.CaptureResult,
  bCaptureResult: RtCaptureResult,
  aCapSet: SpineCore.CapSet,
  bCapSet: RtCapSet,
  bConfig: ReturnType<typeof CoreImpl.Config.make>,
): void {
  // CompositeState — `outputs` carries css/glsl/wgsl/aria; the `wgsl` channel had
  // silently drifted out of the spine mirror.
  const _compositeStateS2R: RtCompositeState = aCompositeState;
  const _compositeStateR2S: SpineCore.CompositeState = bCompositeState;

  // VideoConfig — `durationMs` is `Millis`-branded in the runtime; the spine had
  // plain `number`, which silently accepted unwrapped milliseconds.
  const _videoConfigS2R: RtVideoConfig = aVideoConfig;
  const _videoConfigR2S: SpineCore.VideoConfig = bVideoConfig;

  // CaptureResult — same `Millis`-brand family as VideoConfig; `durationMs` had
  // also drifted to plain `number` in the spine.
  const _captureResultS2R: RtCaptureResult = aCaptureResult;
  const _captureResultR2S: SpineCore.CaptureResult = bCaptureResult;

  // CapSet — `levels` is a canonical CapTier ARRAY in the 0.7.0 runtime; the spine had drifted to
  // `ReadonlySet<CapTier>`, so a consumer's `levels.has(...)` type-checked then crashed on the array.
  const _capSetS2R: RtCapSet = aCapSet;
  const _capSetR2S: SpineCore.CapSet = bCapSet;

  // Config.Shape — owned by the config SPINE (`config.d.ts`), which composes the
  // design-spine mirrors (`Token`/`Theme`/`Style.Shape`). Pinned RUNTIME → SPINE
  // only. The reverse (spine → runtime) is asserted in `__designSpineTypeContract`
  // below, which now pins the design Shapes bidirectionally against the runtime
  // `TokenDef`/`ThemeDef`/`StyleDef`. The runtime → spine direction here still bites
  // on any field the spine `Config.Shape` adds that the runtime lacks.
  const _configR2S: SpineCore.Config.Shape = bConfig;

  void _compositeStateS2R;
  void _compositeStateR2S;
  void _videoConfigS2R;
  void _videoConfigR2S;
  void _captureResultS2R;
  void _captureResultR2S;
  void _capSetS2R;
  void _capSetR2S;
  void _configR2S;
}
void __coreSpineTypeContract;

// ─────────────────────────────────────────────────────────────────────────────
// Type-level conformance: the @czap/design SPINE mirror (`design.d.ts`) and the
// @czap/core RUNTIME design primitives must stay structurally identical.
// `packages/_spine/design.d.ts` hand-mirrors the runtime `TokenDef`/`ThemeDef`/
// `StyleDef` (re-exported as `Token`/`Theme`/`Style.Shape`); the runtime never
// re-imports it (ADR-0010), so this guard is the only thing keeping them honest.
//
// Same BIDIRECTIONAL structural-assignability proof as the core contract: a field
// added/removed on either end — or a brand applied on one side but not the other
// (e.g. the required `_version: 1` literal on every Def, or
// `StyleDef.transition.duration: Millis`) — fails one direction and breaks the
// typecheck. Enforced via tsconfig.tests.json (this file is in its `include`).
// ─────────────────────────────────────────────────────────────────────────────

function __designSpineTypeContract(
  aToken: SpineCore.Token.Shape,
  bToken: RtToken.Shape,
  aTheme: SpineCore.Theme.Shape,
  bTheme: RtTheme.Shape,
  aStyle: SpineCore.Style.Shape,
  bStyle: RtStyle.Shape,
): void {
  // Token.Shape — the spine mirror was missing the required `_version: 1` literal
  // carried by the runtime `TokenDef`; the runtime → spine direction bites on it.
  const _tokenS2R: RtToken.Shape = aToken;
  const _tokenR2S: SpineCore.Token.Shape = bToken;

  // Theme.Shape — same missing `_version: 1` as Token.
  const _themeS2R: RtTheme.Shape = aTheme;
  const _themeR2S: SpineCore.Theme.Shape = bTheme;

  // Style.Shape — missing `_version: 1`, and `transition.duration` had drifted to
  // plain `number` in the spine where the runtime carries `Millis`; the spine →
  // runtime direction bites on the unbranded duration.
  const _styleS2R: RtStyle.Shape = aStyle;
  const _styleR2S: SpineCore.Style.Shape = bStyle;

  void _tokenS2R;
  void _tokenR2S;
  void _themeS2R;
  void _themeR2S;
  void _styleS2R;
  void _styleR2S;
}
void __designSpineTypeContract;

function __edgeSpineTypeContract(
  aHeaders: SpineCore.ClientHintsHeaders,
  bHeaders: EdgePublic.ClientHintsHeaders,
  aTier: SpineCore.EdgeTierResult,
  bTier: EdgePublic.EdgeTierResult,
  aKv: SpineCore.KVNamespace,
  bKv: RtKVNamespace,
  aOutputs: SpineCore.CompiledOutputs,
  bOutputs: RtEdgeCompiledOutputs,
  aGlsl: SpineCore.CompiledGLSLOutput,
  bGlsl: RtCompiledGLSLOutput,
  aWgsl: SpineCore.CompiledWGSLOutput,
  bWgsl: RtCompiledWGSLOutput,
  aCache: SpineCore.BoundaryCache,
  bCache: RtBoundaryCache,
  aTierKey: SpineCore.TierKey,
  bTierKey: RtTierKey,
  aManifestEntry: SpineCore.BoundaryManifestEntry,
  bManifestEntry: RtBoundaryManifestEntry,
  aManifest: SpineCore.BoundaryManifest,
  bManifest: RtBoundaryManifest,
  aManifestFile: SpineCore.BoundaryManifestFile,
  bManifestFile: RtBoundaryManifestFile,
  aThemeConfig: SpineCore.ThemeCompileConfig,
  bThemeConfig: EdgePublic.ThemeCompileConfig,
  aThemeResult: SpineCore.ThemeCompileResult,
  bThemeResult: EdgePublic.ThemeCompileResult,
  aHostContext: SpineCore.EdgeHostContext,
  bHostContext: EdgePublic.EdgeHostContext,
  aCompileContext: SpineCore.EdgeHostCompileContext,
  bCompileContext: EdgePublic.EdgeHostCompileContext,
  aCacheTags: SpineCore.EdgeHostCacheTags,
  bCacheTags: EdgePublic.EdgeHostCacheTags,
  aBoundaryConfig: SpineCore.EdgeHostBoundaryConfig,
  bBoundaryConfig: EdgePublic.EdgeHostBoundaryConfig,
  aCacheConfig: SpineCore.EdgeHostCacheConfig,
  bCacheConfig: EdgePublic.EdgeHostCacheConfig,
  aCacheStatus: SpineCore.EdgeHostCacheStatus,
  bCacheStatus: EdgePublic.EdgeHostCacheStatus,
  aBoundaryResolution: SpineCore.EdgeHostBoundaryResolution,
  bBoundaryResolution: EdgePublic.EdgeHostBoundaryResolution,
  aAdapterConfig: SpineCore.EdgeHostAdapterConfig,
  bAdapterConfig: EdgePublic.EdgeHostAdapterConfig,
  aResolution: SpineCore.EdgeHostResolution,
  bResolution: EdgePublic.EdgeHostResolution,
  aAdapter: SpineCore.EdgeHostAdapter,
  bAdapter: EdgePublic.EdgeHostAdapter,
): void {
  const _headersS2R: EdgePublic.ClientHintsHeaders = aHeaders;
  const _headersR2S: SpineCore.ClientHintsHeaders = bHeaders;
  const _tierS2R: EdgePublic.EdgeTierResult = aTier;
  const _tierR2S: SpineCore.EdgeTierResult = bTier;
  const _kvS2R: RtKVNamespace = aKv;
  const _kvR2S: SpineCore.KVNamespace = bKv;

  // CompiledOutputs — the spine mirror must carry the same JSON-safe GLSL/WGSL
  // payload shapes as the KV boundary cache, not `unknown`.
  const _outputsS2R: RtEdgeCompiledOutputs = aOutputs;
  const _outputsR2S: SpineCore.CompiledOutputs = bOutputs;
  const _glslS2R: RtCompiledGLSLOutput = aGlsl;
  const _glslR2S: SpineCore.CompiledGLSLOutput = bGlsl;
  const _wgslS2R: RtCompiledWGSLOutput = aWgsl;
  const _wgslR2S: SpineCore.CompiledWGSLOutput = bWgsl;

  const _cacheS2R: RtBoundaryCache = aCache;
  const _cacheR2S: SpineCore.BoundaryCache = bCache;
  const _tierKeyS2R: RtTierKey = aTierKey;
  const _tierKeyR2S: SpineCore.TierKey = bTierKey;
  const _manifestEntryS2R: RtBoundaryManifestEntry = aManifestEntry;
  const _manifestEntryR2S: SpineCore.BoundaryManifestEntry = bManifestEntry;
  const _manifestS2R: RtBoundaryManifest = aManifest;
  const _manifestR2S: SpineCore.BoundaryManifest = bManifest;
  const _manifestFileS2R: RtBoundaryManifestFile = aManifestFile;
  const _manifestFileR2S: SpineCore.BoundaryManifestFile = bManifestFile;
  const _themeConfigS2R: EdgePublic.ThemeCompileConfig = aThemeConfig;
  const _themeConfigR2S: SpineCore.ThemeCompileConfig = bThemeConfig;
  const _themeResultS2R: EdgePublic.ThemeCompileResult = aThemeResult;
  const _themeResultR2S: SpineCore.ThemeCompileResult = bThemeResult;
  const _hostContextS2R: EdgePublic.EdgeHostContext = aHostContext;
  const _hostContextR2S: SpineCore.EdgeHostContext = bHostContext;
  const _compileContextS2R: EdgePublic.EdgeHostCompileContext = aCompileContext;
  const _compileContextR2S: SpineCore.EdgeHostCompileContext = bCompileContext;
  const _cacheTagsS2R: EdgePublic.EdgeHostCacheTags = aCacheTags;
  const _cacheTagsR2S: SpineCore.EdgeHostCacheTags = bCacheTags;
  const _boundaryConfigS2R: EdgePublic.EdgeHostBoundaryConfig = aBoundaryConfig;
  const _boundaryConfigR2S: SpineCore.EdgeHostBoundaryConfig = bBoundaryConfig;
  const _cacheConfigS2R: EdgePublic.EdgeHostCacheConfig = aCacheConfig;
  const _cacheConfigR2S: SpineCore.EdgeHostCacheConfig = bCacheConfig;
  const _cacheStatusS2R: EdgePublic.EdgeHostCacheStatus = aCacheStatus;
  const _cacheStatusR2S: SpineCore.EdgeHostCacheStatus = bCacheStatus;
  const _boundaryResolutionS2R: EdgePublic.EdgeHostBoundaryResolution = aBoundaryResolution;
  const _boundaryResolutionR2S: SpineCore.EdgeHostBoundaryResolution = bBoundaryResolution;
  const _adapterConfigS2R: EdgePublic.EdgeHostAdapterConfig = aAdapterConfig;
  const _adapterConfigR2S: SpineCore.EdgeHostAdapterConfig = bAdapterConfig;
  const _resolutionS2R: EdgePublic.EdgeHostResolution = aResolution;
  const _resolutionR2S: SpineCore.EdgeHostResolution = bResolution;
  const _adapterS2R: EdgePublic.EdgeHostAdapter = aAdapter;
  const _adapterR2S: SpineCore.EdgeHostAdapter = bAdapter;

  void _headersS2R;
  void _headersR2S;
  void _tierS2R;
  void _tierR2S;
  void _kvS2R;
  void _kvR2S;
  void _outputsS2R;
  void _outputsR2S;
  void _glslS2R;
  void _glslR2S;
  void _wgslS2R;
  void _wgslR2S;
  void _cacheS2R;
  void _cacheR2S;
  void _tierKeyS2R;
  void _tierKeyR2S;
  void _manifestEntryS2R;
  void _manifestEntryR2S;
  void _manifestS2R;
  void _manifestR2S;
  void _manifestFileS2R;
  void _manifestFileR2S;
  void _themeConfigS2R;
  void _themeConfigR2S;
  void _themeResultS2R;
  void _themeResultR2S;
  void _hostContextS2R;
  void _hostContextR2S;
  void _compileContextS2R;
  void _compileContextR2S;
  void _cacheTagsS2R;
  void _cacheTagsR2S;
  void _boundaryConfigS2R;
  void _boundaryConfigR2S;
  void _cacheConfigS2R;
  void _cacheConfigR2S;
  void _cacheStatusS2R;
  void _cacheStatusR2S;
  void _boundaryResolutionS2R;
  void _boundaryResolutionR2S;
  void _adapterConfigS2R;
  void _adapterConfigR2S;
  void _resolutionS2R;
  void _resolutionR2S;
  void _adapterS2R;
  void _adapterR2S;
}
void __edgeSpineTypeContract;

// Factory runtime values also satisfy the spine (the original one-way pins, kept
// so the assertion bites even via the package index, not only the producing
// module): `Config.make` / `defineConfig` outputs are assignable to the spine
// `Config.Shape`.
const _coreConfig: SpineCore.Config.Shape = CoreImpl.Config.make({});
const _plugin: ReturnType<typeof CoreImpl.defineConfig> = CoreImpl.defineConfig({});
void _coreConfig;
void _plugin;

// ─────────────────────────────────────────────────────────────────────────────
// Runtime existence checks
// ─────────────────────────────────────────────────────────────────────────────

describe('spine conformance — @czap/core', () => {
  test('Config.make exported and callable', () => {
    expect(typeof CoreImpl.Config.make).toBe('function');
    const cfg = CoreImpl.Config.make({});
    expect(cfg._tag).toBe('ConfigDef');
    expect(cfg.id).toMatch(/^fnv1a:/);
  });

  test('Config.toViteConfig exported and callable', () => {
    expect(typeof CoreImpl.Config.toViteConfig).toBe('function');
    const cfg = CoreImpl.Config.make({});
    expect(CoreImpl.Config.toViteConfig(cfg)).toBeDefined();
  });

  test('defineConfig exported and callable', () => {
    expect(typeof CoreImpl.defineConfig).toBe('function');
  });

  test('Boundary exported from @czap/core (regression guard)', () => {
    expect(typeof CoreImpl.Boundary.make).toBe('function');
  });
});

describe('spine conformance — @czap/vite', () => {
  test('resolvePrimitive exported and callable', () => {
    expect(typeof ViteImpl.resolvePrimitive).toBe('function');
  });

  test('plugin exported and callable', () => {
    expect(typeof ViteImpl.plugin).toBe('function');
  });
});

describe('spine conformance — @czap/compiler', () => {
  test('dispatch exported and callable', () => {
    expect(typeof CompilerImpl.dispatch).toBe('function');
  });

});
