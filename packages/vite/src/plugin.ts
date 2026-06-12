/**
 * Main Vite 8 plugin for czap -- processes `@token`, `@theme`,
 * `@style`, and `@quantize` CSS blocks, handles HMR, serves virtual
 * modules, and configures build environments.
 *
 * Transform pipeline order: tokens -- themes -- styles -- quantize.
 * This ordering ensures themes / styles can reference token custom
 * properties that were already compiled earlier in the pipeline.
 *
 * @module
 */

import { readFileSync } from 'node:fs';
import type { EnvironmentModuleGraph, EnvironmentModuleNode, Plugin } from 'vite';
import type { Boundary, Token, Theme, Style } from '@czap/core';
import type { BoundaryManifest } from '@czap/edge';
import { collectBoundaryManifest } from './boundary-manifest.js';
import { collectTokenManifest, collectThemeManifest } from './token-manifest.js';
import { parseQuantizeBlocks, compileQuantizeBlock, viewportContainmentRule } from './css-quantize.js';
import { blankCssCommentsAndStrings, braceDepthDelta, cssPrologueEnd } from './css-scan.js';
import { resolvePrimitive } from './primitive-resolve.js';
import { unresolvedPrimitiveWarning } from './primitive-resolve.js';
import { transformHTML } from './html-transform.js';
import { parseTokenBlocks, compileTokenBlock } from './token-transform.js';
import { parseThemeBlocks, compileThemeBlock } from './theme-transform.js';
import { parseStyleBlocks, compileStyleBlock } from './style-transform.js';
import { resolveVirtualId, loadVirtualModule } from './virtual-modules.js';
import { buildEnvironments, type CzapEnvironmentName } from './environments.js';
import { resolveWASM, formatWasmSearchPaths } from './wasm-resolve.js';
import { normalizeCssLineEndings } from './normalize-css-eol.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Configuration options for the {@link plugin} factory. Every field
 * is optional; omitted values use convention-based defaults.
 */
export interface PluginConfig {
  /** Override source directories for each primitive kind. */
  readonly dirs?: Partial<Record<'boundary' | 'token' | 'theme' | 'style', string>>;
  /** Toggle surgical HMR emission (default `true`). */
  readonly hmr?: boolean;
  /** Named Vite environments to configure (browser / server / shader). Defaults to browser when omitted. */
  readonly environments?: readonly ('browser' | 'server' | 'shader')[];
  /** Opt-in WASM runtime configuration (`true` or `{ enabled: true }`). */
  readonly wasm?: boolean | { readonly enabled?: boolean; readonly path?: string };
}

/** Default Vite environments when {@link PluginConfig.environments} is omitted. */
const DEFAULT_ENVIRONMENTS: readonly CzapEnvironmentName[] = ['browser'];

function resolveEnvironmentNames(configured?: readonly CzapEnvironmentName[]): readonly CzapEnvironmentName[] {
  return configured ?? DEFAULT_ENVIRONMENTS;
}

function normalizeWasmConfig(wasm?: boolean | { readonly enabled?: boolean; readonly path?: string }): {
  readonly enabled: boolean;
  readonly path?: string;
} {
  if (wasm === true) return { enabled: true };
  if (wasm === false || wasm === undefined) return { enabled: false };
  return { enabled: wasm.enabled === true, path: wasm.path };
}

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

/** Supported authoring grammar per at-rule, quoted verbatim in parse-miss warnings. */
const SUPPORTED_GRAMMAR: Record<'@token' | '@quantize', string> = {
  '@token': '`@token <name> { /* optional overrides: prop: value; */ }` where <name> matches a Token.make() export',
  '@quantize':
    '`@quantize <boundaryName> { <stateName> { prop: value; <selector> { prop: value; } } }` where <boundaryName> matches a Boundary.make() export and each <stateName> is one of its states',
};

/**
 * 1-based line of the first occurrence of `marker` in `css`, or `null`
 * when the marker does not appear (e.g. it only lived inside a comment
 * or a string value — callers pass a comment- and string-blanked copy).
 */
function markerLine(css: string, marker: string): number | null {
  const idx = css.indexOf(marker);
  if (idx === -1) return null;
  return css.slice(0, idx).split('\n').length;
}

/**
 * Doctor-style warning for a parse miss: the file contains an at-rule
 * marker, but the parser matched zero blocks — the at-rule is left
 * untransformed and the browser will silently discard it. Names the
 * file:line, the probable cause, and the exact supported grammar.
 */
function parseMissWarning(marker: '@token' | '@quantize', id: string, line: number): string {
  return (
    `Found ${marker} in ${id}:${line} but no ${marker} block parsed, so it was left untransformed ` +
    `(browsers discard unknown at-rules, so it contributes no CSS). ` +
    `Probable cause: an unsupported dialect such as an anonymous block (\`${marker} { ... }\`) ` +
    `or an inline declaration (\`${marker} name: value;\`). ` +
    `Fix: rewrite it to the supported grammar ${SUPPORTED_GRAMMAR[marker]}.`
  );
}

/**
 * Doctor-style warning for a `@quantize` block whose states all parsed
 * to zero declarations: the block matched, but its body produced no CSS.
 */
function emptyQuantizeWarning(boundaryName: string, id: string, line: number): string {
  return (
    `@quantize ${boundaryName} in ${id}:${line} parsed to zero declarations — every state body is empty, ` +
    `so the block compiles to no @container rules. ` +
    `Probable cause: the state bodies use a syntax the parser does not support. ` +
    `Fix: write each state per the supported grammar ${SUPPORTED_GRAMMAR['@quantize']}.`
  );
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

/**
 * Create the czap Vite plugin.
 *
 * Transforms CSS files containing `@token`, `@theme`, `@style`, and
 * `@quantize` blocks into native CSS custom properties,
 * `html[data-theme]` selectors, scoped `@layer` / `@scope` rules, and
 * `@container` queries respectively. Uses convention-based definition
 * resolution and provides HMR support for surgical CSS and shader
 * uniform updates.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { czap } from '@czap/vite';
 * const config = { plugins: [czap()] };
 * ```
 */
export function plugin(config?: PluginConfig): Plugin {
  const hmrEnabled = config?.hmr !== false;
  const wasmConfig = normalizeWasmConfig(config?.wasm);
  const wasmEnabled = wasmConfig.enabled;
  let projectRoot = process.cwd();
  let isBuild = false;
  let resolvedWasm: ReturnType<typeof resolveWASM> = null;
  if (wasmEnabled) {
    resolvedWasm = resolveWASM(projectRoot, wasmConfig.path);
  }
  let emittedWasmRefId: string | null = null;

  // Caches for resolved definitions to avoid re-importing on every transform
  const boundaryCache = new Map<string, Boundary.Shape | null>();
  const tokenCache = new Map<string, Token.Shape | null>();
  const themeCache = new Map<string, Theme.Shape | null>();
  const styleCache = new Map<string, Style.Shape | null>();

  // Lazily-collected boundary manifest backing `virtual:czap/boundaries`.
  // Reset whenever a definition or CSS file changes so dev imports stay fresh.
  let boundaryManifestPromise: Promise<BoundaryManifest> | null = null;
  let tokenThemeManifestPromise: Promise<{
    tokens: Awaited<ReturnType<typeof collectTokenManifest>>;
    themes: Awaited<ReturnType<typeof collectThemeManifest>>;
  }> | null = null;

  function invalidateDesignVirtualModules(
    moduleGraph: EnvironmentModuleGraph,
    affected: EnvironmentModuleNode[],
  ): void {
    for (const virtualId of ['\0virtual:czap/tokens', '\0virtual:czap/tokens.css', '\0virtual:czap/themes'] as const) {
      const mod = moduleGraph.getModuleById(virtualId);
      if (mod) {
        moduleGraph.invalidateModule(mod);
        affected.push(mod);
      }
    }
  }

  return {
    name: '@czap/vite',
    enforce: 'pre' as const,

    configResolved(resolvedConfig) {
      projectRoot = resolvedConfig.root;
      isBuild = resolvedConfig.command === 'build';
      resolvedWasm = null;
      if (wasmEnabled) {
        resolvedWasm = resolveWASM(projectRoot, wasmConfig.path);
      }
    },

    buildStart() {
      if (!wasmEnabled) {
        return;
      }

      resolvedWasm = resolveWASM(projectRoot, wasmConfig.path);
      if (!resolvedWasm) {
        const searched = formatWasmSearchPaths(projectRoot, wasmConfig.path);
        this.warn(
          `WASM support was enabled, but no czap-compute binary could be resolved. Searched: ${searched}. ` +
            'Fix: build the crate (`cargo build --target wasm32-unknown-unknown --release` in crates/czap-compute) ' +
            'or copy the binary to public/czap-compute.wasm. Runtime will fall back to TypeScript kernels.',
        );
        return;
      }

      if (isBuild) {
        emittedWasmRefId = this.emitFile({
          type: 'asset',
          name: 'czap-compute.wasm',
          source: readFileSync(resolvedWasm.filePath),
        });
      }
    },

    // -----------------------------------------------------------------------
    // HMR client script injection
    // -----------------------------------------------------------------------

    transformIndexHtml() {
      if (!hmrEnabled) return [];
      return [
        {
          tag: 'script' as const,
          attrs: { type: 'module' },
          children: `import 'virtual:czap/hmr-client';`,
          injectTo: 'head' as const,
        },
      ];
    },

    // -----------------------------------------------------------------------
    // Virtual module resolution
    // -----------------------------------------------------------------------

    resolveId(id: string) {
      return resolveVirtualId(id);
    },

    load(id: string) {
      if (id === '\0virtual:czap/boundaries') {
        // Async only on this branch: the manifest scan imports definition
        // modules. Other virtual modules stay synchronous.
        if (!boundaryManifestPromise) {
          boundaryManifestPromise = collectBoundaryManifest(projectRoot, { boundaryDir: config?.dirs?.boundary });
        }
        return boundaryManifestPromise.then((boundaries) => loadVirtualModule(id, { boundaries }));
      }

      if (id === '\0virtual:czap/tokens' || id === '\0virtual:czap/tokens.css' || id === '\0virtual:czap/themes') {
        if (!tokenThemeManifestPromise) {
          tokenThemeManifestPromise = Promise.all([
            collectTokenManifest(projectRoot, { tokenDir: config?.dirs?.token }),
            collectThemeManifest(projectRoot, { themeDir: config?.dirs?.theme }),
          ]).then(([tokens, themes]) => ({ tokens, themes }));
        }
        return tokenThemeManifestPromise.then(({ tokens, themes }) => loadVirtualModule(id, { tokens, themes }));
      }

      if (id === '\0virtual:czap/wasm-url') {
        if (!wasmEnabled) {
          return 'export const wasmUrl = null;';
        }

        if (!resolvedWasm) {
          return 'export const wasmUrl = null;';
        }

        if (isBuild && emittedWasmRefId) {
          return `export const wasmUrl = import.meta.ROLLUP_FILE_URL_${emittedWasmRefId};`;
        }

        // Distinct op (NOT repo-path normalization, CUT B5b): a `/@fs/` browser URL
        // segment for the Vite dev server — a URL, not a filesystem path. Left inline.
        const browserUrl =
          resolvedWasm.source === 'public' ? '/czap-compute.wasm' : `/@fs/${resolvedWasm.filePath.replace(/\\/g, '/')}`;

        return `export const wasmUrl = ${JSON.stringify(browserUrl)};`;
      }

      return loadVirtualModule(id);
    },

    // -----------------------------------------------------------------------
    // CSS transform pipeline: tokens -> themes -> styles -> quantize
    // -----------------------------------------------------------------------

    async transform(code: string, id: string) {
      if (id.endsWith('.html') || id.endsWith('.astro')) {
        const transformed = await transformHTML(code, id, projectRoot, config?.dirs?.boundary);
        if (transformed === code) {
          return null;
        }

        return {
          code: transformed,
          map: null,
        };
      }

      // Only process CSS files
      if (!id.endsWith('.css')) return null;

      // Quick check -- skip files with no @czap at-rules
      const hasToken = code.includes('@token');
      const hasTheme = code.includes('@theme');
      const hasStyle = code.includes('@style');
      const hasQuantize = code.includes('@quantize');

      if (!hasToken && !hasTheme && !hasStyle && !hasQuantize) return null;

      let transformed = normalizeCssLineEndings(code);
      // Comment- and string-blanked copy of the original source for
      // parse-miss diagnostics: marker positions stay stable across
      // phases, and markers inside comments, string values, or data
      // URLs never trigger warnings.
      const scanBlanked = blankCssCommentsAndStrings(transformed);

      // ---- Phase 1: @token -> CSS custom properties + @property ----
      if (hasToken) {
        const tokenBlocks = parseTokenBlocks(transformed, id);

        if (tokenBlocks.length === 0) {
          const line = markerLine(scanBlanked, '@token');
          if (line !== null) {
            this.warn(parseMissWarning('@token', id, line));
          }
        }

        for (const block of tokenBlocks) {
          const cacheKey = `${block.tokenName}:${id}`;
          let token: Token.Shape | null | undefined = tokenCache.get(cacheKey);

          if (token === undefined) {
            const resolution = await resolvePrimitive('token', block.tokenName, id, projectRoot, config?.dirs?.token);
            token = resolution?.primitive ?? null;
            tokenCache.set(cacheKey, token);
          }

          if (token === null) {
            this.warn(
              unresolvedPrimitiveWarning('token', block.tokenName, id, block.line, projectRoot, config?.dirs?.token),
            );
            continue;
          }

          const compiled = compileTokenBlock(block, token);
          const blockSpan = findAtRuleBlock(transformed, '@token', block.tokenName);

          if (blockSpan) {
            transformed = transformed.substring(0, blockSpan.start) + compiled + transformed.substring(blockSpan.end);
          }
        }
      }

      // ---- Phase 2: @theme -> html[data-theme] selectors + transitions ----
      if (hasTheme) {
        const themeBlocks = parseThemeBlocks(transformed, id);

        for (const block of themeBlocks) {
          const cacheKey = `${block.themeName}:${id}`;
          let theme: Theme.Shape | null | undefined = themeCache.get(cacheKey);

          if (theme === undefined) {
            const resolution = await resolvePrimitive('theme', block.themeName, id, projectRoot, config?.dirs?.theme);
            theme = resolution?.primitive ?? null;
            themeCache.set(cacheKey, theme);
          }

          if (theme === null) {
            this.warn(
              unresolvedPrimitiveWarning('theme', block.themeName, id, block.line, projectRoot, config?.dirs?.theme),
            );
            continue;
          }

          const compiled = compileThemeBlock(block, theme);
          const blockSpan = findAtRuleBlock(transformed, '@theme', block.themeName);

          if (blockSpan) {
            transformed = transformed.substring(0, blockSpan.start) + compiled + transformed.substring(blockSpan.end);
          }
        }
      }

      // ---- Phase 3: @style -> scoped CSS with @layer/@scope/@starting-style ----
      if (hasStyle) {
        const styleBlocks = parseStyleBlocks(transformed, id);

        for (const block of styleBlocks) {
          const cacheKey = `${block.styleName}:${id}`;
          let style: Style.Shape | null | undefined = styleCache.get(cacheKey);

          if (style === undefined) {
            const resolution = await resolvePrimitive('style', block.styleName, id, projectRoot, config?.dirs?.style);
            style = resolution?.primitive ?? null;
            styleCache.set(cacheKey, style);
          }

          if (style === null) {
            this.warn(
              unresolvedPrimitiveWarning('style', block.styleName, id, block.line, projectRoot, config?.dirs?.style),
            );
            continue;
          }

          const compiled = compileStyleBlock(block, style);
          const blockSpan = findAtRuleBlock(transformed, '@style', block.styleName);

          if (blockSpan) {
            transformed = transformed.substring(0, blockSpan.start) + compiled + transformed.substring(blockSpan.end);
          }
        }
      }

      // ---- Phase 4: @quantize -> @container queries (existing) ----
      if (hasQuantize) {
        const quantizeBlocks = parseQuantizeBlocks(transformed, id);

        if (quantizeBlocks.length === 0) {
          const line = markerLine(scanBlanked, '@quantize');
          if (line !== null) {
            this.warn(parseMissWarning('@quantize', id, line));
          }
        }

        for (const block of quantizeBlocks) {
          const stateBodies = Object.values(block.states);
          const allStatesEmpty =
            stateBodies.length > 0 &&
            stateBodies.every(
              (body) =>
                Object.keys(body.bareProps).length === 0 &&
                body.rules.every((rule) => Object.keys(rule.props).length === 0),
            );
          if (allStatesEmpty) {
            this.warn(emptyQuantizeWarning(block.boundaryName, id, block.line));
          }
        }

        // Sheet-level containment aggregation: every viewport-based block
        // contributes its container name here, and ONE `:root` rule is
        // emitted for the whole file below. Per-block `:root` rules would
        // overwrite each other (`container-name` is a replaced property),
        // leaving all but the last boundary's @container queries dead.
        const viewportContainerNames = new Set<string>();

        for (const block of quantizeBlocks) {
          const cacheKey = `${block.boundaryName}:${id}`;
          let boundary: Boundary.Shape | null | undefined = boundaryCache.get(cacheKey);

          if (boundary === undefined) {
            const resolution = await resolvePrimitive(
              'boundary',
              block.boundaryName,
              id,
              projectRoot,
              config?.dirs?.boundary,
            );
            boundary = resolution?.primitive ?? null;
            boundaryCache.set(cacheKey, boundary);
          }

          if (boundary === null) {
            this.warn(
              unresolvedPrimitiveWarning(
                'boundary',
                block.boundaryName,
                id,
                block.line,
                projectRoot,
                config?.dirs?.boundary,
              ),
            );
            continue;
          }

          const compiled = compileQuantizeBlock(block, boundary, { viewportContainerNames });
          const blockSpan = findAtRuleBlock(transformed, '@quantize', block.boundaryName);

          if (blockSpan) {
            transformed = transformed.substring(0, blockSpan.start) + compiled + transformed.substring(blockSpan.end);
          }
        }

        const containment = viewportContainmentRule(viewportContainerNames);
        if (containment) {
          // CSS requires `@charset` to be the very first thing in a sheet
          // and `@import` / `@namespace` to precede all style rules —
          // prepending the `:root` containment rule ahead of them would
          // make browsers ignore the imports. Insert it AFTER the leading
          // at-rule prologue instead (located on a comment/string-blanked
          // copy, so decoy markers inside comments or strings never count).
          const insertAt = cssPrologueEnd(blankCssCommentsAndStrings(transformed));
          transformed =
            insertAt === 0
              ? `${containment}\n\n${transformed}`
              : `${transformed.slice(0, insertAt)}\n\n${containment}\n${transformed.slice(insertAt)}`;
        }
      }

      if (transformed === code) return null;

      return {
        code: transformed,
        map: null,
      };
    },

    // -----------------------------------------------------------------------
    // HMR: invalidate caches + re-transform on definition file changes
    // -----------------------------------------------------------------------

    hotUpdate(options) {
      if (!hmrEnabled) return;

      const file = options.file;

      // Invalidate definition caches when source files change
      const isDefFile =
        file.endsWith('.boundaries.ts') ||
        file.endsWith('/boundaries.ts') ||
        file.endsWith('.tokens.ts') ||
        file.endsWith('/tokens.ts') ||
        file.endsWith('.themes.ts') ||
        file.endsWith('/themes.ts') ||
        file.endsWith('.styles.ts') ||
        file.endsWith('/styles.ts');

      if (isDefFile) {
        // Clear all caches since definitions may cross-reference
        boundaryCache.clear();
        tokenCache.clear();
        themeCache.clear();
        styleCache.clear();
        boundaryManifestPromise = null;
        tokenThemeManifestPromise = null;

        const moduleGraph = this.environment.moduleGraph;
        const transformModules = Array.from(moduleGraph.idToModuleMap.values()).filter((mod) => {
          const moduleId = mod.id;
          return (
            typeof moduleId === 'string' &&
            (moduleId.endsWith('.css') || moduleId.endsWith('.astro') || moduleId.endsWith('.html'))
          );
        });

        // Definitions feed the boundary manifest; re-load the virtual module
        // so `import { boundaries } from 'virtual:czap/boundaries'` stays fresh.
        const manifestModule = moduleGraph.getModuleById('\0virtual:czap/boundaries');
        if (manifestModule) {
          moduleGraph.invalidateModule(manifestModule);
          transformModules.push(manifestModule);
        }

        invalidateDesignVirtualModules(moduleGraph, transformModules);

        if (transformModules.length > 0) {
          return transformModules;
        }
      }

      if (file.endsWith('.css') || file.endsWith('.astro') || file.endsWith('.html')) {
        const moduleGraph = this.environment.moduleGraph;
        // Returning an array from hotUpdate REPLACES Vite's own affected
        // list — start from options.modules (Vite's computed set, which
        // covers query-bearing ids like `Page.astro?astro&type=style`
        // that an exact getModuleById(file) lookup would miss) so the
        // edited file's own HMR is never suppressed.
        const affectedModules: EnvironmentModuleNode[] = [...options.modules];

        // @quantize states contribute to the boundary manifest, so a CSS
        // or .astro-style edit must re-load `virtual:czap/boundaries` too
        // (same as the definition-file path above) -- otherwise importers
        // keep the stale module even though the cached manifest was
        // dropped. (.astro components carry @quantize in <style> blocks
        // and feed the manifest scan since the .astro-scan fix.)
        if (file.endsWith('.css') || file.endsWith('.astro')) {
          boundaryManifestPromise = null;
          const manifestModule = moduleGraph.getModuleById('\0virtual:czap/boundaries');
          if (manifestModule) {
            moduleGraph.invalidateModule(manifestModule);
            affectedModules.push(manifestModule);
          }
        }

        if (affectedModules.length > 0) {
          return affectedModules;
        }
      }

      return;
    },

    config() {
      const envNames = resolveEnvironmentNames(config?.environments);
      if (envNames.length === 0) return {};

      const envs = buildEnvironments(envNames);

      return {
        environments: envs,
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Find the full span of an at-rule block in CSS source.
 * Returns the start/end character offsets, or null if not found.
 *
 * Works for any at-rule pattern: `@token`, `@theme`, `@style`,
 * `@quantize`. Searches and brace-counts on a comment- and
 * string-blanked copy of the source (same offsets, via
 * {@link blankCssCommentsAndStrings}), so marker text inside comments,
 * string values (`content: "@token x {"`), or unquoted data URLs never
 * matches, and braces inside those constructs never skew the depth
 * count. The returned offsets splice the ORIGINAL source.
 */
function findAtRuleBlock(css: string, marker: string, name: string): { start: number; end: number } | null {
  // Offset-preserving blank of comments / strings / url() contents:
  // every index into `scan` is a valid index into `css`.
  const scan = blankCssCommentsAndStrings(css);
  let searchFrom = 0;
  // Running depth from the last scan position — the parsers accept at-rule
  // markers only at the sheet's top level (braceDepthDelta guard), so the
  // REPLACEMENT search must apply the same rule, or a marker inside a
  // declaration value (`--x: @style card {...};`) earlier in the sheet
  // gets spliced in place of the real block the parser accepted.
  let depthFrom = 0;
  let depthAtFrom = 0;

  while (searchFrom < scan.length) {
    const idx = scan.indexOf(marker, searchFrom);
    if (idx === -1) return null;

    depthAtFrom = braceDepthDelta(scan, depthFrom, idx, depthAtFrom);
    depthFrom = idx;
    if (depthAtFrom > 0) {
      searchFrom = idx + marker.length;
      continue;
    }

    // Verify this at-rule is followed by the target name
    const afterMarker = scan.substring(idx + marker.length).trimStart();
    if (!afterMarker.startsWith(name)) {
      searchFrom = idx + marker.length;
      continue;
    }

    // Ensure the name isn't just a prefix of a longer identifier
    const charAfterName = afterMarker[name.length];
    if (charAfterName !== undefined && /[a-zA-Z0-9_-]/.test(charAfterName)) {
      searchFrom = idx + marker.length;
      continue;
    }

    // Find the opening brace
    const braceStart = scan.indexOf('{', idx);
    /* v8 ignore next — unreachable under real call sites: `findAtRuleBlock` runs only
       after `parseTokenBlocks`/etc. matched a `@marker name { ... }` block with braces,
       so the `{` is always still present in the transformed source. Defensive against
       future multi-phase edits that strip braces between parse and lookup. */
    if (braceStart === -1) return null;

    // Walk forward counting depth. Comments, strings, and url() contents
    // are already blanked, so every remaining brace is structural.
    let depth = 1;
    let pos = braceStart + 1;

    while (pos < scan.length && depth > 0) {
      const ch = scan[pos]!;
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      pos++;
    }

    if (depth === 0) {
      return { start: idx, end: pos };
    }
    return null;
  }
  /* v8 ignore next — unreachable under real call sites: the inner `while` only runs
     when `parseTokenBlocks` has already matched a `@marker name { ... }` block, so the
     first indexOf hit returns either a `{start,end}` span or null inside the loop.
     This terminal `return null` is a defense against pathological CSS where the
     marker+name hits but searchFrom exhausts without a `{` match. */
  return null;
}
