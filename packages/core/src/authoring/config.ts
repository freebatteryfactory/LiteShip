/**
 * Config -- unified project configuration hub.
 *
 * defineConfig() produces a frozen, FNV-1a content-addressed Config.
 * Projection functions are pure — no side effects, no I/O.
 */

import type { ContentAddress } from '../schema/brands.js';
import type { DeepReadonly } from '../schema/types.js';
import type { Boundary } from './boundary.js';
import type { Token } from './token.js';
import type { Theme } from './theme.js';
import type { Style } from './style.js';
import { fnv1aBytes } from '../evidence/fnv.js';
import { CanonicalCbor } from '../schema/cbor.js';
import { normalizeRepoPath } from '../repository-path.js';
import { snapshotDefinitionValue } from '../evidence/definition-snapshot.js';
import { booleanValue, inputRecord, nonEmptyString, stringArray } from './input-validation.js';
import { ValidationError } from '@liteship/error';

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────

/** Top-level discriminator for liteship primitives: which bucket a declaration belongs to. */
export type PrimitiveKind = 'boundary' | 'token' | 'theme' | 'style';

/**
 * Vite-plugin slice of a liteship {@link Config}: source directories per
 * primitive kind, HMR opt-in, environment targeting, and optional WASM hints.
 */
export interface PluginConfig {
  readonly dirs?: Partial<Record<PrimitiveKind, string>>;
  readonly hmr?: boolean;
  readonly environments?: readonly ('browser' | 'server' | 'shader')[];
  readonly wasm?: boolean | { readonly enabled?: boolean; readonly path?: string };
}

/** Astro-integration slice of a liteship {@link Config}. */
export interface AstroConfig {
  readonly adaptive?: boolean;
  readonly edgeRuntime?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Config namespace + value object (declaration merging — same pattern as Boundary)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Config namespace — the single hub that every liteship adapter (Vite, Astro, test
 * runners, edge runtime) projects from. Construction lives in the standalone
 * {@link defineConfig}, which produces a frozen, FNV-1a content-addressed
 * {@link Config}; every projection function here (`toViteConfig`, `toAstroConfig`,
 * `toTestAliases`) is pure.
 */
export const Config = {
  /** Project the Vite-plugin slice of a config for `@liteship/vite`. */
  toViteConfig(cfg: Config): PluginConfig {
    return {
      ...(cfg.vite?.dirs !== undefined && { dirs: cfg.vite.dirs }),
      ...(cfg.vite?.hmr !== undefined && { hmr: cfg.vite.hmr }),
      ...(cfg.vite?.environments !== undefined && { environments: cfg.vite.environments }),
      ...(cfg.vite?.wasm !== undefined && { wasm: cfg.vite.wasm }),
    };
  },

  /** Project the Astro-integration slice of a config for `@liteship/astro`. */
  toAstroConfig(cfg: Config): AstroConfig {
    return {
      ...(cfg.astro?.adaptive !== undefined && { adaptive: cfg.astro.adaptive }),
      ...(cfg.astro?.edgeRuntime !== undefined && { edgeRuntime: cfg.astro.edgeRuntime }),
    };
  },

  /** Materialize the `@liteship/*` → source-path alias map used by the vitest runner. */
  toTestAliases(cfg: Config, repoRoot: string): Record<string, string> {
    void cfg; // cfg reserved for future per-project customisation
    const r = (sub: string) => `${normalizeRepoPath(repoRoot)}/${sub}`;
    // NOTE: longer prefixes MUST come before shorter ones — vitest's alias
    // resolver matches the first prefix in iteration order, so e.g.
    // Longer public subpaths would be intercepted by `@liteship/core` if listed first.
    return {
      '@liteship/canonical': r('packages/canonical/src/index.ts'),
      '@liteship/genui': r('packages/genui/src/index.ts'),
      '@liteship/core/harness': r('packages/core/src/harness/index.ts'),
      '@liteship/core/simulation': r('packages/core/src/simulation/index.ts'),
      '@liteship/core/ecs': r('packages/core/src/ecs/index.ts'),
      '@liteship/core/fs-walk': r('packages/core/src/fs-walk.ts'),
      '@liteship/core/authoring': r('packages/core/src/authoring/index.ts'),
      '@liteship/core/reactive': r('packages/core/src/reactive/index.ts'),
      '@liteship/core/motion': r('packages/core/src/motion/index.ts'),
      '@liteship/core/graph': r('packages/core/src/graph/index.ts'),
      '@liteship/core/evidence': r('packages/core/src/evidence/index.ts'),
      '@liteship/core/schema': r('packages/core/src/schema/index.ts'),
      '@liteship/core/media': r('packages/core/src/media/index.ts'),
      '@liteship/core/clock': r('packages/core/src/clock/index.ts'),
      '@liteship/core/wasm': r('packages/core/src/wasm/index.ts'),
      '@liteship/core': r('packages/core/src/index.ts'),
      '@liteship/quantizer/testing': r('packages/quantizer/src/testing.ts'),
      '@liteship/quantizer': r('packages/quantizer/src/index.ts'),
      '@liteship/compiler/parse': r('packages/compiler/src/parse/index.ts'),
      '@liteship/compiler/migrate': r('packages/compiler/src/migrate/index.ts'),
      '@liteship/compiler': r('packages/compiler/src/index.ts'),
      '@liteship/web/lite': r('packages/web/src/lite.ts'),
      '@liteship/web': r('packages/web/src/index.ts'),
      '@liteship/detect': r('packages/detect/src/index.ts'),
      '@liteship/vite/html-transform': r('packages/vite/src/html-transform.ts'),
      '@liteship/vite': r('packages/vite/src/index.ts'),
      '@liteship/astro/adaptive-runtime': r('packages/astro/src/adaptive-runtime.ts'),
      '@liteship/astro/runtime': r('packages/astro/src/runtime/index.ts'),
      '@liteship/astro': r('packages/astro/src/index.ts'),
      '@liteship/stage/ffmpeg': r('packages/stage/src/ffmpeg.ts'),
      '@liteship/stage': r('packages/stage/src/index.ts'),
      '@liteship/remotion': r('packages/remotion/src/index.ts'),
      '@liteship/scene/dev': r('packages/scene/src/dev/server.ts'),
      '@liteship/scene': r('packages/scene/src/index.ts'),
      '@liteship/assets': r('packages/assets/src/index.ts'),
      '@liteship/audit': r('packages/audit/src/index.ts'),
      '@liteship/cli': r('packages/cli/src/index.ts'),
      '@liteship/mcp-server': r('packages/mcp-server/src/index.ts'),
      '@liteship/edge': r('packages/edge/src/index.ts'),
      '@liteship/cloudflare/testing': r('packages/cloudflare/src/testing.ts'),
      '@liteship/cloudflare': r('packages/cloudflare/src/index.ts'),
      '@liteship/worker': r('packages/worker/src/index.ts'),
      '@liteship/_spine': r('packages/_spine'),
    };
  },
};

/** Frozen, content-addressed result of {@link defineConfig}. */
export interface Config {
  readonly _tag: 'ConfigDef';
  readonly id: ContentAddress;
  readonly boundaries: DeepReadonly<Record<string, Boundary>>;
  readonly tokens: DeepReadonly<Record<string, Token>>;
  readonly themes: DeepReadonly<Record<string, Theme>>;
  readonly styles: DeepReadonly<Record<string, Style>>;
  readonly vite?: DeepReadonly<Partial<PluginConfig>>;
  readonly astro?: DeepReadonly<Partial<AstroConfig>>;
}

/** Raw user-facing input to {@link defineConfig} — every field is optional. */
export interface ConfigInput {
  readonly boundaries?: Record<string, Boundary>;
  readonly tokens?: Record<string, Token>;
  readonly themes?: Record<string, Theme>;
  readonly styles?: Record<string, Style>;
  readonly vite?: Partial<PluginConfig>;
  readonly astro?: Partial<AstroConfig>;
}

type ConfigDefinition = Boundary | Token | Theme | Style;

/**
 * Copy and freeze one registry while preserving each definition's semantic
 * shape. Definitions are aggregate members, so Config identity addresses their
 * existing ids rather than re-encoding their implementation fields.
 */
function snapshotDefinitionRegistry<T extends ConfigDefinition>(
  registry: Readonly<Record<string, T>>,
  snapshotMember: (member: T) => DeepReadonly<T>,
): DeepReadonly<Record<string, T>> {
  return Object.freeze(
    Object.fromEntries(Object.entries(registry).map(([name, member]) => [name, snapshotMember(member)])),
  ) as DeepReadonly<Record<string, T>>;
}

/**
 * Boundary specs have one deliberately host-only field: `deviceFilter`. Keep
 * that callback attached while snapshotting every portable field around it.
 * The callback is not canonical data and is already excluded from Boundary id.
 */
function snapshotBoundary(boundary: Boundary): DeepReadonly<Boundary> {
  const { spec, ...portableBoundary } = boundary;
  const snappedBoundary = snapshotDefinitionValue(portableBoundary);
  if (spec === undefined) return snappedBoundary as DeepReadonly<Boundary>;

  const { deviceFilter, ...portableSpec } = spec;
  const snappedSpec = Object.freeze({
    ...snapshotDefinitionValue(portableSpec),
    ...(deviceFilter !== undefined ? { deviceFilter } : {}),
  });
  return Object.freeze({ ...snappedBoundary, spec: snappedSpec }) as DeepReadonly<Boundary>;
}

/**
 * Styles embed their boundary definition. Snapshot ordinary authored fields
 * recursively, then route the embedded boundary through the callback-aware
 * boundary snapshot so host-only `deviceFilter` remains usable without
 * entering portable identity bytes.
 */
function snapshotStyle(style: Style): DeepReadonly<Style> {
  const { boundary, ...portableStyle } = style;
  const snappedStyle = snapshotDefinitionValue(portableStyle);
  if (boundary === undefined) return snappedStyle as DeepReadonly<Style>;

  return Object.freeze({
    ...snappedStyle,
    boundary: snapshotBoundary(boundary),
  }) as DeepReadonly<Style>;
}

function definitionIds<T extends ConfigDefinition>(
  registry: Readonly<Record<string, T>>,
): Record<string, ContentAddress> {
  return Object.fromEntries(Object.entries(registry).map(([name, member]) => [name, member.id]));
}

function validateDefinitionRegistry(value: unknown, field: string, expectedTag: string): void {
  if (value === undefined) return;
  const registry = inputRecord(value, 'defineConfig', Object.keys(value as object));
  for (const [name, member] of Object.entries(registry)) {
    nonEmptyString(name, 'defineConfig', `${field} key`);
    if (
      typeof member !== 'object' ||
      member === null ||
      (member as { _tag?: unknown })._tag !== expectedTag ||
      typeof (member as { id?: unknown }).id !== 'string'
    ) {
      throw ValidationError('defineConfig', `${field}.${name} must be a definition produced by its define* owner.`);
    }
  }
}

function validatePluginConfig(value: unknown): void {
  if (value === undefined) return;
  const vite = inputRecord(value, 'defineConfig', ['dirs', 'hmr', 'environments', 'wasm']);
  if (vite['dirs'] !== undefined) {
    const dirs = inputRecord(vite['dirs'], 'defineConfig', ['boundary', 'token', 'theme', 'style']);
    for (const [kind, path] of Object.entries(dirs)) nonEmptyString(path, 'defineConfig', `vite.dirs.${kind}`);
  }
  if (vite['hmr'] !== undefined) booleanValue(vite['hmr'], 'defineConfig', 'vite.hmr');
  if (vite['environments'] !== undefined) {
    const environments = stringArray(vite['environments'], 'defineConfig', 'vite.environments');
    const allowed = new Set(['browser', 'server', 'shader']);
    const foreign = environments.filter((environment) => !allowed.has(environment));
    if (foreign.length > 0)
      throw ValidationError('defineConfig', `vite.environments contains unsupported value ${foreign[0]}.`);
  }
  if (vite['wasm'] !== undefined && typeof vite['wasm'] !== 'boolean') {
    const wasm = inputRecord(vite['wasm'], 'defineConfig', ['enabled', 'path']);
    if (wasm['enabled'] !== undefined) booleanValue(wasm['enabled'], 'defineConfig', 'vite.wasm.enabled');
    if (wasm['path'] !== undefined) nonEmptyString(wasm['path'], 'defineConfig', 'vite.wasm.path');
  }
}

function validateAstroConfig(value: unknown): void {
  if (value === undefined) return;
  const astro = inputRecord(value, 'defineConfig', ['adaptive', 'edgeRuntime']);
  if (astro['adaptive'] !== undefined) booleanValue(astro['adaptive'], 'defineConfig', 'astro.adaptive');
  if (astro['edgeRuntime'] !== undefined) booleanValue(astro['edgeRuntime'], 'defineConfig', 'astro.edgeRuntime');
}

/**
 * Define a liteship {@link Config} — the single project-configuration hub every
 * adapter (Vite, Astro, test runners, edge runtime) projects from. Produces a
 * frozen, FNV-1a content-addressed value from raw {@link ConfigInput}.
 */
export function defineConfig(input: ConfigInput): Config {
  const admitted = inputRecord(input, 'defineConfig', ['boundaries', 'tokens', 'themes', 'styles', 'vite', 'astro']);
  validateDefinitionRegistry(admitted['boundaries'], 'boundaries', 'BoundaryDef');
  validateDefinitionRegistry(admitted['tokens'], 'tokens', 'TokenDef');
  validateDefinitionRegistry(admitted['themes'], 'themes', 'ThemeDef');
  validateDefinitionRegistry(admitted['styles'], 'styles', 'StyleDef');
  validatePluginConfig(admitted['vite']);
  validateAstroConfig(admitted['astro']);
  const config = admitted as unknown as ConfigInput;
  const boundaries = snapshotDefinitionRegistry(config.boundaries ?? {}, snapshotBoundary);
  const tokens = snapshotDefinitionRegistry(config.tokens ?? {}, snapshotDefinitionValue);
  const themes = snapshotDefinitionRegistry(config.themes ?? {}, snapshotDefinitionValue);
  const styles = snapshotDefinitionRegistry(config.styles ?? {}, snapshotStyle);
  const vite = config.vite === undefined ? undefined : snapshotDefinitionValue(config.vite);
  const astro = config.astro === undefined ? undefined : snapshotDefinitionValue(config.astro);
  // CUT B5a — mint the internal identity through the CanonicalCbor doctrine
  // (RFC 8949 §4.2.1, recursive key sort, always-float64), the same path as
  // every other `fnv1a:` content address. This replaces the old top-level-only
  // `JSON.stringify` sort, which left nested non-`id` fields insertion-order
  // dependent. CanonicalCbor sorts keys recursively, so no manual sort is needed.
  const id = fnv1aBytes(
    CanonicalCbor.encode({
      boundaries: definitionIds(boundaries),
      tokens: definitionIds(tokens),
      themes: definitionIds(themes),
      styles: definitionIds(styles),
      vite,
      astro,
    }),
  );
  return Object.freeze({
    _tag: 'ConfigDef' as const,
    id,
    boundaries,
    tokens,
    themes,
    styles,
    vite,
    astro,
  });
}
