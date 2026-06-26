/**
 * Spine conformance — runtime existence + type-level structural checks.
 *
 * Bang 2: full checks including @czap/_spine type imports.
 */

import { describe, test, expect } from 'vitest';
import type * as SpineCore from '@czap/_spine';
import * as CoreImpl from '@czap/core';
import * as ViteImpl from '@czap/vite';
import * as CompilerImpl from '@czap/compiler';

// Runtime truth — the @czap/core types whose hand-authored mirror lives in
// `packages/_spine/core.d.ts`. Imported from the producing modules DIRECTLY (not
// only via the package index) so the guarded surface is exactly the runtime types.
import type { CompositeState as RtCompositeState } from '../../packages/core/src/compositor.js';
import type { VideoConfig as RtVideoConfig } from '../../packages/core/src/video.js';
import type { CaptureResult as RtCaptureResult } from '../../packages/core/src/capture.js';
import type { CompiledOutputs as RtEdgeCompiledOutputs } from '../../packages/edge/src/kv-cache.js';

// Runtime truth for the @czap/design SPINE mirror (`packages/_spine/design.d.ts`).
// The runtime `TokenDef`/`ThemeDef`/`StyleDef` interfaces are not exported by name;
// they are re-exported as the `Token`/`Theme`/`Style` namespaces' `Shape` member from
// their producing modules. Imported directly (not via the package index) so the
// guarded surface is exactly the runtime types.
import type { Token as RtToken } from '../../packages/core/src/token.js';
import type { Theme as RtTheme } from '../../packages/core/src/theme.js';
import type { Style as RtStyle } from '../../packages/core/src/style.js';

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

function __edgeSpineTypeContract(aOutputs: SpineCore.CompiledOutputs, bOutputs: RtEdgeCompiledOutputs): void {
  // CompiledOutputs — the spine mirror must carry the same JSON-safe GLSL/WGSL
  // payload shapes as the KV boundary cache, not `unknown`.
  const _outputsS2R: RtEdgeCompiledOutputs = aOutputs;
  const _outputsR2S: SpineCore.CompiledOutputs = bOutputs;

  void _outputsS2R;
  void _outputsR2S;
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
