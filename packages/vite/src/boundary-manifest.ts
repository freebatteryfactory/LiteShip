/**
 * Build-time boundary manifest derivation.
 *
 * Scans a project for boundary definition modules (`boundaries.ts` /
 * `*.boundaries.ts`) and `@quantize` CSS blocks, then derives the
 * `BoundaryManifest` that `virtual:liteship/boundaries` exports and the
 * `@liteship/astro` integration writes to `liteship-boundary-manifest.json`: each
 * boundary's `defineBoundary` content address plus precompiled
 * `CompiledOutputs` for every (motion x design) tier.
 *
 * This is the build half of the edge caching design (ADR-0003): identity
 * and compilation are derived here, so edge workers consume the manifest
 * instead of hand-typing boundary ids or bundling the CSS compiler.
 *
 * @module
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Diagnostics } from '@liteship/core';
import type { Boundary } from '@liteship/core';
import { walkFiles } from '@liteship/core/fs-walk';
import { CSSCompiler, dispatch, type CSSAtRuleGroup } from '@liteship/compiler';
import type { WGSLUniformValue, WGSLUniformVector } from '@liteship/compiler';
import { DESIGN_TIERS, MOTION_TIERS, dedupeOutputsByTier, tierKey } from '@liteship/edge';
import type { BoundaryManifest, BoundaryManifestEntry, CompiledOutputs, TierKey } from '@liteship/edge';
import {
  CAST_TARGETS,
  parseQuantizeBlocks,
  viewportContainmentRule,
  viewportQueryAxis,
  type CastTarget,
  type QuantizeAtRuleGroup,
  type QuantizeStateBody,
} from './css-quantize.js';
import { findConventionFiles } from './resolve-fs.js';

const DIAGNOSTIC_SOURCE = 'liteship/vite.boundary-manifest';

/** Directory names never descended into while scanning a project. */
const SKIP_DIRS = new Set(['node_modules', 'dist', 'coverage', '.git', '.astro', '.wrangler', '.cache', '.output']);

/** Options for {@link collectBoundaryManifest}. */
export interface CollectBoundaryManifestOptions {
  /**
   * Extra directory holding boundary definitions -- mirror of the plugin's
   * `dirs.boundary` override; scanned in addition to the project walk.
   */
  readonly boundaryDir?: string;
  /**
   * Selector the auto-emitted viewport `@container` containment is declared
   * on (default `:root`) -- mirror of the plugin's `quantize.container`, so
   * the manifest-served CSS matches the transform layer's containment target.
   */
  readonly container?: string;
}

/** The set of scannable files (boundary modules + stylesheets) from one project walk. */
export interface ProjectScan {
  readonly boundaryFiles: readonly string[];
  readonly cssFiles: readonly string[];
}

/** Project-wide boundary definitions keyed by export name, including their source module path. */
export type BoundaryDefinitionMap = ReadonlyMap<string, { readonly primitive: Boundary; readonly source: string }>;

function isBoundaryModuleFile(fileName: string): boolean {
  return fileName === 'boundaries.ts' || fileName.endsWith('.boundaries.ts');
}

/**
 * Walk the project once, collecting boundary-definition modules and stylesheets.
 * Package-internal (not re-exported from the entry): the Vite plugin shares one scan
 * across the manifest + definitions derivations instead of walking the tree twice.
 */
export function scanProject(projectRoot: string): ProjectScan {
  const boundaryFiles: string[] = [];
  const cssFiles: string[] = [];
  // Symlink-following, realpath cycle-safe walk (the shared fs-walk owner);
  // its per-target filter can't express `boundaries.ts`'s exact/suffix split,
  // so classify each absolute path by basename here.
  for (const file of walkFiles(projectRoot, { skipDirs: SKIP_DIRS, followSymlinks: true })) {
    const name = path.basename(file);
    if (isBoundaryModuleFile(name)) {
      boundaryFiles.push(file);
    } else if (name.endsWith('.css') || name.endsWith('.astro')) {
      // .astro components carry @quantize inside <style> blocks (the
      // repo examples author them this way) — the manifest scan must
      // read them or those projects get empty outputsByTier.
      cssFiles.push(file);
    }
  }

  // Deterministic order: merge order decides duplicate-declaration winners
  // below, so full-path sort keeps the winner stable everywhere (matches the
  // total path order the previous hand-rolled walker produced).
  boundaryFiles.sort();
  cssFiles.sort();
  return { boundaryFiles, cssFiles };
}

/**
 * Import a boundary definition module and return every export tagged
 * `BoundaryDef`, keyed by export name. Import failures degrade to an
 * empty result with a diagnostic (same policy as `resolvePrimitive`).
 */
async function importBoundaryExports(modulePath: string): Promise<ReadonlyMap<string, Boundary>> {
  const found = new Map<string, Boundary>();
  let imported: Record<string, unknown> | null = null;
  try {
    // Native ESM caches dynamic imports by URL — after a dev-server edit
    // to a boundaries module, re-importing the bare file URL would serve
    // the STALE exports even though the manifest recollects. The mtime
    // query busts the cache exactly when the file content changed (and
    // keeps the URL stable — and the module cached — when it didn't).
    const mtime = fs.statSync(modulePath).mtimeMs;
    imported = (await import(/* @vite-ignore */ `${pathToFileURL(modulePath).href}?mtime=${mtime}`)) as Record<
      string,
      unknown
    >;
  } catch (error) {
    Diagnostics.warn({
      source: DIAGNOSTIC_SOURCE,
      code: 'import-failed',
      message: `Failed to import boundary module "${modulePath}"; its boundaries are missing from the manifest.`,
      cause: error,
    });
  }
  for (const [exportName, value] of Object.entries(imported ?? {})) {
    if (value && typeof value === 'object' && '_tag' in value && value._tag === 'BoundaryDef') {
      // Runtime `_tag` guard validates the shape; same containment cast as
      // the resolver import boundary in resolve-utils.ts.
      found.set(exportName, value as Boundary);
    }
  }
  return found;
}

/**
 * Collect boundary definitions over a pre-computed {@link ProjectScan} (shared with the
 * manifest derivation so the project tree is walked once). Package-internal.
 */
export async function collectBoundaryDefinitionsFromScan(
  projectRoot: string,
  scan: ProjectScan,
  options?: Pick<CollectBoundaryManifestOptions, 'boundaryDir'>,
): Promise<Map<string, { readonly primitive: Boundary; readonly source: string }>> {
  const boundaryFiles = new Set<string>(scan.boundaryFiles);
  if (options?.boundaryDir) {
    const dir = path.resolve(projectRoot, options.boundaryDir);
    const direct = path.join(dir, 'boundaries.ts');
    if (fs.existsSync(direct)) boundaryFiles.add(direct);
    for (const file of findConventionFiles(dir, '.boundaries.ts', DIAGNOSTIC_SOURCE)) {
      boundaryFiles.add(file);
    }
  }

  // Resolve every exported boundary definition, keyed by export name.
  const boundariesByName = new Map<string, { readonly primitive: Boundary; readonly source: string }>();
  for (const file of boundaryFiles) {
    for (const [exportName, boundary] of await importBoundaryExports(file)) {
      const existing = boundariesByName.get(exportName);
      if (existing && existing.primitive.id !== boundary.id) {
        Diagnostics.warnOnce({
          source: DIAGNOSTIC_SOURCE,
          code: 'duplicate-boundary-name',
          message:
            `Two boundary modules export "${exportName}" with different definitions ` +
            `(${existing.primitive.id} vs ${boundary.id}); the first one found wins in the manifest. ` +
            `Fix: rename one export so each boundary name is unique within the project.`,
        });
        continue;
      }
      boundariesByName.set(exportName, { primitive: boundary, source: file });
    }
  }
  return boundariesByName;
}

/**
 * Internal helper used by the Vite transform to share the manifest's
 * project-wide boundary discovery instead of falling back to per-file
 * convention resolution for `@quantize`.
 */
export async function collectBoundaryDefinitions(
  projectRoot: string,
  options?: Pick<CollectBoundaryManifestOptions, 'boundaryDir'>,
): Promise<BoundaryDefinitionMap> {
  return collectBoundaryDefinitionsFromScan(projectRoot, scanProject(projectRoot), options);
}

/** The slice of {@link CompiledOutputs} the non-CSS cast loop populates. */
type CastOutputs = Pick<CompiledOutputs, 'aria' | 'glsl' | 'wgsl'>;

/**
 * Coerce a `@glsl` segment's authored string values into the scalar uniform map
 * the GLSL compiler consumes. Non-numeric values are dropped (the segment
 * authored `1.0`, `0`, `-2` etc.); the compiler then infers a stable type
 * across states.
 */
function numericCastState(attrs: Record<string, string>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(attrs)) {
    const n = Number(value);
    if (value.trim() !== '' && Number.isFinite(n)) out[key] = n;
  }
  return out;
}

function wgslVector(parts: readonly number[]): WGSLUniformVector | undefined {
  if (parts.length === 2) return [parts[0]!, parts[1]!];
  if (parts.length === 3) return [parts[0]!, parts[1]!, parts[2]!];
  if (parts.length === 4) return [parts[0]!, parts[1]!, parts[2]!, parts[3]!];
  return undefined;
}

/**
 * Parse a `@wgsl` cast value into a scalar or vector. Returns `'invalid'` when the
 * author wrote a vector constructor whose component count does not match the
 * declared arity (or a count outside vec2/vec3/vec4) — the caller turns that into a
 * loud diagnostic instead of a silently-wrong offset (ADR-0029).
 */
function parseWgslCastValue(value: string): WGSLUniformValue | 'invalid' | undefined {
  const trimmed = value.trim();
  if (trimmed === '') return undefined;
  const scalar = Number(trimmed);
  if (Number.isFinite(scalar)) return scalar;
  // Match a WGSL vector constructor in either the shorthand (`vec2f(...)`) or the
  // generic (`vec2<f32>(...)`) form, capturing the DECLARED arity and the argument
  // list. The generic `<...>` must be stripped whole, or its digits (`f32` -> 32)
  // leak into the component scan and mis-shape the vector.
  const ctor = /^vec([234])(?:[fiu]|<[^>]*>)?\s*\(([^)]*)\)$/i.exec(trimmed);
  const declaredArity = ctor ? Number(ctor[1]) : undefined;
  // Constructor args, or a bare CSS-authored component list (`1 2`, `1, 2`).
  const componentSource = ctor ? ctor[2]! : trimmed;
  // The component source must be a PURE numeric list -- never arbitrary text with
  // stray digits. Without this, `10px` / `calc(100% - 1px)` / `var(--scale-2)` would
  // scan their digits into a false scalar/vector uniform and change the struct layout.
  const numericList =
    /^[\s,]*[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?(?:[\s,]+[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)*[\s,]*$/i;
  if (!numericList.test(componentSource)) return 'invalid';
  const parts = [...componentSource.matchAll(/[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/gi)]
    .map((match) => Number(match[0]))
    .filter((part) => Number.isFinite(part));
  if (parts.length === 0) return undefined;
  // A constructor pins the arity: a component-count mismatch is an authoring error,
  // not something to silently reshape into a different vecN.
  if (declaredArity !== undefined && parts.length !== declaredArity) return 'invalid';
  if (parts.length === 1) return parts[0]!;
  return wgslVector(parts) ?? 'invalid';
}

/**
 * Coerce a `@wgsl` segment's authored string values into the scalar/vector map
 * the WGSL compiler consumes. Non-numeric values are dropped silently; a malformed
 * vector (component count mismatched to the declared vecN, or outside vec2/vec3/vec4)
 * is dropped LOUDLY via `warnOnce` rather than shipped as a silently-wrong offset.
 */
function wgslCastState(attrs: Record<string, string>): Record<string, WGSLUniformValue> {
  const out: Record<string, WGSLUniformValue> = {};
  for (const [key, value] of Object.entries(attrs)) {
    const parsed = parseWgslCastValue(value);
    if (parsed === 'invalid') {
      Diagnostics.warnOnce({
        source: 'liteship/vite.wgsl-cast',
        code: `wgsl-cast-value-malformed:${key}`,
        message:
          `@wgsl uniform "${key}" value "${value}" is not a valid uniform -- expected a number, a ` +
          `numeric component list, or a vec2/vec3/vec4 constructor with a matching component count ` +
          `(not arbitrary text like "10px" or "calc(...)"). It was dropped instead of shipped as a ` +
          `silently-wrong offset. Fix: author a number or vecN, e.g. vec2<f32>(x, y).`,
        detail: { key, value },
      });
      continue;
    }
    if (parsed !== undefined) out[key] = parsed;
  }
  return out;
}

/**
 * One non-CSS cast target's wiring: how to gather its authored per-state
 * attribute maps and how to route them through {@link dispatch} onto a
 * {@link CompiledOutputs} field. The build loop iterates these in order, so
 * adding a cast target is a new entry here — not a hand-written arm.
 */
interface CastDescriptor {
  /** The `CompiledOutputs` field this cast lands on (also its `castAttrs` key). */
  readonly target: CastTarget;
  /**
   * Gather authored per-state maps and run the matching compiler, returning the
   * value stored on `CompiledOutputs[target]`, or `undefined` when no state
   * authored this cast (so the field stays absent — the `aria` policy).
   */
  readonly compile: (
    boundary: Boundary,
    perState: Readonly<Record<string, Record<string, string>>>,
  ) => CastOutputs[CastTarget];
}

/**
 * Ordered non-CSS cast descriptors — the generalized spine. Each routes a
 * cast target through `dispatch` (ARIA → `ARIACompiler`, GLSL → `GLSLCompiler`,
 * WGSL → `WGSLCompiler`) and content-addresses identically (the result is part
 * of `CompiledOutputs`, hashed by `dedupeOutputsByTier`). The order matches
 * `CAST_TARGETS`.
 */
const NON_CSS_CASTS: readonly CastDescriptor[] = [
  {
    target: 'aria',
    compile: (boundary, perState) => {
      // `stateAttributes` is fully keyed by ARIACompiler (states without `@aria`
      // get `{}`), so the runtime can resolve any state.
      const result = dispatch({
        _tag: 'ARIACompiler',
        boundary,
        states: { states: { ...perState }, currentState: boundary.states[0] },
      });
      return result.target === 'aria' ? result.result.stateAttributes : undefined;
    },
  },
  {
    target: 'glsl',
    compile: (boundary, perState) => {
      const numericStates = Object.fromEntries(
        Object.entries(perState).map(([state, attrs]) => [state, numericCastState(attrs)]),
      );
      const result = dispatch({ _tag: 'GLSLCompiler', boundary, states: numericStates });
      return result.target === 'glsl'
        ? {
            declarations: result.result.declarations,
            uniformValues: result.result.uniformValues,
            // Per-state authored uniforms ride to the runtime so a crossing
            // resolves `stateUniforms[currentState]` (the GLSL analog of ARIA's
            // per-state `stateAttributes`), not just the flat default.
            stateUniforms: result.result.stateUniforms,
          }
        : undefined;
    },
  },
  {
    target: 'wgsl',
    compile: (boundary, perState) => {
      const wgslStates = Object.fromEntries(
        Object.entries(perState).map(([state, attrs]) => [state, wgslCastState(attrs)]),
      );
      const result = dispatch({ _tag: 'WGSLCompiler', boundary, states: wgslStates });
      return result.target === 'wgsl'
        ? {
            declarations: result.result.declarations,
            bindingValues: result.result.bindingValues,
            // Per-state authored bindings ride to the runtime so a crossing
            // resolves `stateBindings[currentState]` — the WGSL analog of GLSL's
            // per-state `stateUniforms`, not just the flat default.
            stateBindings: result.result.stateBindings,
          }
        : undefined;
    },
  },
];

/**
 * Run every non-CSS cast target against a boundary's authored `@<target>`
 * segments and collect the results onto the {@link CompiledOutputs} cast
 * fields. A target with no authored segment is omitted entirely (the field
 * stays absent), so byte-identical boundaries without a cast hash the same.
 *
 * This is the target-driven loop that replaced the hand-written CSS+ARIA arms:
 * the CSS cast stays inline above (it owns the tier grid + containment), while
 * every other target is one {@link NON_CSS_CASTS} descriptor.
 */
function compileNonCssCasts(boundary: Boundary, states: Record<string, QuantizeStateBody>): Partial<CastOutputs> {
  const casts: Partial<Record<CastTarget, CastOutputs[CastTarget]>> = {};
  for (const descriptor of NON_CSS_CASTS) {
    // Per-state authored attribute maps for this target, dropping states that
    // did not author it (and empty segments).
    const perState: Record<string, Record<string, string>> = {};
    for (const [stateName, body] of Object.entries(states)) {
      const attrs = body.castAttrs?.[descriptor.target];
      if (attrs && Object.keys(attrs).length > 0) perState[stateName] = attrs;
    }
    if (Object.keys(perState).length === 0) continue;
    const output = descriptor.compile(boundary, perState);
    if (output !== undefined) casts[descriptor.target] = output;
  }
  return casts as Partial<CastOutputs>;
}

/**
 * Compile one boundary's `@quantize` states into the deduplicated
 * `outputs` pool + per-tier index map, covering the full finite
 * (motion x design) tier grid so any tier a request resolves to has a
 * precompiled entry.
 *
 * The container queries are tier-invariant (the CSS itself adapts via
 * `@container`); `propertyRegistrations` exist solely to enable
 * GPU-interpolated transitions, so the `none` motion tier (reduced
 * motion) omits them. That makes at most TWO distinct outputs across the
 * ~20-cell grid -- `dedupeOutputsByTier` stores each once instead of
 * serializing the same CSS bytes per cell.
 */
function compileOutputsByTier(
  boundary: Boundary,
  states: Record<string, QuantizeStateBody>,
  container?: string,
): Pick<BoundaryManifestEntry, 'outputs' | 'outputsByTier'> {
  // Bridge the parser's rule shape (props) to the compiler's (properties),
  // exactly as compileQuantizeBlock does — including nested @supports/@media
  // groups (#110) so manifest-served CSS matches the vite transform path.
  const mapAtRuleGroup = (group: QuantizeAtRuleGroup): CSSAtRuleGroup => ({
    prelude: group.prelude,
    bareProps: group.bareProps,
    rules: group.rules.map((rule) => ({ selector: rule.selector, properties: rule.props })),
    ...(group.atRuleGroups?.length ? { atRuleGroups: group.atRuleGroups.map(mapAtRuleGroup) } : {}),
  });
  const cssStates = Object.fromEntries(
    Object.entries(states).map(([stateName, body]) => {
      const atRuleGroups = (body.atRuleGroups ?? []).map(mapAtRuleGroup);
      return [
        stateName,
        {
          bareProps: body.bareProps,
          rules: body.rules.map((rule) => ({ selector: rule.selector, properties: rule.props })),
          ...(atRuleGroups.length > 0 ? { atRuleGroups } : {}),
        },
      ];
    }),
  );
  // Manifest-served CSS reaches the page WITHOUT the vite transform that
  // normally emits sheet-level containment — without a `:root` container
  // declaration the @container queries match nothing (the exact lie the
  // transform layer fixed). Dimension-measuring viewport boundaries
  // (width or height axis) carry their containment inline; other inputs
  // follow the transform layer's policy (the consumer declares the
  // container).
  const containerName = boundary.input.replace(/[^a-zA-Z0-9_-]/g, '-');
  const containment =
    viewportQueryAxis(boundary.input) !== null ? viewportContainmentRule([containerName], container) : null;
  // Route the CSS cast through the single build caster (`dispatch`) rather than
  // a direct compile call — the same multiplexer the ARIA cast below uses.
  const cssCast = dispatch({ _tag: 'CSSCompiler', boundary, states: cssStates });
  const compiled = cssCast.target === 'css' ? cssCast.result.raw : '';
  const containerQueries = containment ? `${containment}\n\n${compiled}` : compiled;

  // Non-CSS casts (tier-invariant): each authored `@<target> { … }` segment
  // routes through the same build caster (`dispatch`) and lands on its own
  // `CompiledOutputs` field. The loop below is the generalized spine — adding a
  // cast target is one entry in `NON_CSS_CASTS`, not a new hand-written arm.
  const casts = compileNonCssCasts(boundary, states);

  // Property registrations scan custom-property names/syntax only, so the
  // nested-rule props flatten into the same per-state map as bareProps.
  const flatStates = Object.fromEntries(
    Object.entries(states).map(([stateName, body]) => [
      stateName,
      { ...body.bareProps, ...Object.assign({}, ...body.rules.map((rule) => rule.props)) },
    ]),
  ) as Record<string, Record<string, string>>;
  const propertyRegistrations = CSSCompiler.generatePropertyRegistrations(flatStates);

  const outputsByTier: Partial<Record<TierKey, CompiledOutputs>> = {};
  for (const motionTier of MOTION_TIERS) {
    const registrations = motionTier === 'none' ? '' : propertyRegistrations;
    const css = [registrations, containerQueries].filter((part) => part.length > 0).join('\n\n');
    const outputs: CompiledOutputs = {
      css,
      propertyRegistrations: registrations,
      containerQueries,
      ...casts,
    };
    for (const designTier of DESIGN_TIERS) {
      outputsByTier[tierKey({ motionTier, designTier })] = outputs;
    }
  }
  return dedupeOutputsByTier(outputsByTier);
}

/**
 * Serialize one deduplicated boundary output into the bytes emitted as a static
 * CSS asset. Theme `:root` CSS is deliberately absent: themes are a
 * request-time axis and stay inline/tiny, while these assets remain
 * theme-agnostic and content-hashed.
 */
export function serializeBoundaryOutput(output: CompiledOutputs): string {
  return output.css;
}

/**
 * Derive the `BoundaryManifest` for a project.
 *
 * Walks `projectRoot` (skipping `node_modules`, build output, and VCS
 * directories) for boundary definition modules and `@quantize` CSS
 * blocks, then emits one entry per exported boundary: its minted
 * `ContentAddress` and precompiled per-tier outputs (deduplicated --
 * `outputs` pools the distinct compiled strings, `outputsByTier` holds
 * pool indices). Boundaries with no `@quantize` block get an entry with
 * empty `outputs`/`outputsByTier` -- the id is still the sanctioned way
 * for hosts to derive cache configuration.
 *
 * @example
 * ```ts
 * import { collectBoundaryManifest } from '@liteship/vite';
 * import { resolveOutputsByTier } from '@liteship/edge';
 *
 * const manifest = await collectBoundaryManifest('/path/to/app');
 * // manifest.viewport.id === 'fnv1a:…' (defineBoundary's address)
 * // resolveOutputsByTier(manifest.viewport)['transitions:standard'].css
 * ```
 *
 * @param projectRoot - Absolute path of the project to scan.
 * @param options - Optional `boundaryDir` override (mirror of `dirs.boundary`).
 * @returns The derived manifest (empty object when nothing is found).
 */
export async function collectBoundaryManifest(
  projectRoot: string,
  options?: CollectBoundaryManifestOptions,
): Promise<BoundaryManifest> {
  return collectBoundaryManifestFromScan(projectRoot, scanProject(projectRoot), options);
}

/**
 * {@link collectBoundaryManifest} over a pre-computed {@link ProjectScan}. Lets the Vite
 * plugin walk the project tree ONCE and share the scan with
 * {@link collectBoundaryDefinitionsFromScan}, instead of each derivation re-scanning.
 * Package-internal (not re-exported from the entry).
 */
export async function collectBoundaryManifestFromScan(
  projectRoot: string,
  scan: ProjectScan,
  options?: CollectBoundaryManifestOptions,
): Promise<BoundaryManifest> {
  const boundaryDefinitions = await collectBoundaryDefinitionsFromScan(projectRoot, scan, {
    boundaryDir: options?.boundaryDir,
  });

  // Merge @quantize states per boundary across all CSS files.
  const statesByBoundary = new Map<string, Record<string, QuantizeStateBody>>();
  for (const cssFile of scan.cssFiles) {
    let css: string;
    try {
      const raw = fs.readFileSync(cssFile, 'utf8');
      // For .astro components, the stylesheet text lives inside <style>
      // blocks — extract and concatenate them; everything else is markup.
      css = cssFile.endsWith('.astro')
        ? Array.from(raw.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g), (m) => m[1] ?? '').join('\n')
        : raw;
    } catch (error) {
      Diagnostics.warnOnce({
        source: DIAGNOSTIC_SOURCE,
        code: 'css-read-failed',
        message: `Could not read "${cssFile}" while collecting @quantize blocks; it is skipped.`,
        cause: error,
      });
      continue;
    }
    if (!css.includes('@quantize')) continue;
    for (const block of parseQuantizeBlocks(css, cssFile)) {
      if (!boundaryDefinitions.has(block.boundaryName)) {
        Diagnostics.warnOnce({
          source: DIAGNOSTIC_SOURCE,
          code: 'unresolved-quantize-boundary',
          message:
            `@quantize block in ${cssFile}:${block.line} references boundary "${block.boundaryName}", ` +
            `but no boundaries.ts / *.boundaries.ts module in ${projectRoot} exports it, so it has no manifest entry. ` +
            `Fix: add \`export const ${block.boundaryName} = defineBoundary({ ... })\` to a boundary module.`,
        });
        continue;
      }
      const merged = statesByBoundary.get(block.boundaryName) ?? {};
      for (const [stateName, body] of Object.entries(block.states)) {
        const prior = merged[stateName];
        // True cascade order across separate CSS files is unknowable at
        // build time (it depends on HTML link order), so duplicate
        // property values can only be resolved by the deterministic
        // file-sort order — surface a teaching conflict warning so the
        // author resolves the ambiguity explicitly.
        const warnConflict = (where: string, prop: string, priorValue: string, value: string): void => {
          Diagnostics.warnOnce({
            source: DIAGNOSTIC_SOURCE,
            code: 'duplicate-declaration-conflict',
            message:
              `@quantize ${block.boundaryName} state "${stateName}" sets ${where} "${prop}" in more than one CSS file ` +
              `with different values ("${priorValue}" vs "${value}" from ${cssFile}:${block.line}). ` +
              `Manifest merging cannot know your stylesheet link order — the later file in sorted path order wins. ` +
              `Fix: declare "${prop}" for this state in ONE file.`,
          });
        };
        for (const [prop, value] of Object.entries(body.bareProps)) {
          const priorValue = prior?.bareProps[prop];
          if (priorValue !== undefined && priorValue !== value) {
            warnConflict('', prop, priorValue, value);
          }
        }
        // Nested-selector rules conflict the same way: the same selector's
        // same property set differently across files.
        for (const rule of body.rules) {
          const priorRule = prior?.rules.find((r) => r.selector === rule.selector);
          if (!priorRule) continue;
          for (const [prop, value] of Object.entries(rule.props)) {
            const priorValue = priorRule.props[prop];
            if (priorValue !== undefined && priorValue !== value) {
              warnConflict(`"${rule.selector}"`, prop, priorValue, value);
            }
          }
        }
        // Authored `@<target>` cast attributes conflict the same way across
        // files. Merge each cast target uniformly (the generalized spine), then
        // derive `ariaAttrs` from the merged `aria` cast so existing consumers
        // read it unchanged.
        const mergedCasts: Partial<Record<CastTarget, Record<string, string>>> = {};
        for (const target of CAST_TARGETS) {
          const priorAttrs = prior?.castAttrs?.[target];
          const bodyAttrs = body.castAttrs?.[target];
          for (const [prop, value] of Object.entries(bodyAttrs ?? {})) {
            const priorValue = priorAttrs?.[prop];
            if (priorValue !== undefined && priorValue !== value) {
              warnConflict(`@${target}`, prop, priorValue, value);
            }
          }
          const mergedTarget = { ...priorAttrs, ...bodyAttrs };
          if (Object.keys(mergedTarget).length > 0) mergedCasts[target] = mergedTarget;
        }
        const hasCasts = Object.keys(mergedCasts).length > 0;
        const mergedAtRuleGroups = [...(prior?.atRuleGroups ?? []), ...(body.atRuleGroups ?? [])];
        const hasAtRuleGroups = mergedAtRuleGroups.length > 0;
        merged[stateName] = {
          bareProps: { ...prior?.bareProps, ...body.bareProps },
          rules: [...(prior?.rules ?? []), ...body.rules],
          ...(hasAtRuleGroups ? { atRuleGroups: mergedAtRuleGroups } : {}),
          ...(hasCasts ? { castAttrs: mergedCasts } : {}),
          ...(mergedCasts.aria ? { ariaAttrs: mergedCasts.aria } : {}),
        };
      }
      statesByBoundary.set(block.boundaryName, merged);
    }
  }

  const manifest: Record<string, BoundaryManifestEntry> = {};
  for (const [name, definition] of boundaryDefinitions) {
    const boundary = definition.primitive;
    const states = statesByBoundary.get(name);
    manifest[name] = {
      id: boundary.id,
      ...(states ? compileOutputsByTier(boundary, states, options?.container) : { outputs: [], outputsByTier: {} }),
    };
  }
  return manifest;
}
