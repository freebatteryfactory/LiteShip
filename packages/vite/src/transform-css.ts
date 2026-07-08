/**
 * Standalone `@token` / `@theme` / `@style` / `@quantize` CSS transform.
 *
 * This is the 4-phase CSS walk lifted out of the Vite plugin's `transform`
 * hook into a pure function over an explicit {@link TransformCssContext}, so
 * it is testable without the Vite plugin lifecycle: pass a `warn` sink, a
 * {@link PrimitiveResolutionCache}, the project root + dirs, and you exercise
 * the whole pipeline directly.
 *
 * Transform pipeline order: tokens → themes → styles → quantize. This ordering
 * ensures themes / styles can reference token custom properties that were
 * already compiled earlier in the pipeline.
 *
 * Composition over inheritance: standalone functions over an explicit context
 * record, no classes.
 *
 * @module
 */

import type { Boundary, Token, Theme, Style } from '@czap/core';
import { ValidationError } from '@czap/error';
import { parseQuantizeBlocks, compileQuantizeBlock, viewportContainmentRule } from './css-quantize.js';
import { blankCssCommentsAndStrings, braceDepthDelta, cssPrologueEnd } from './css-scan.js';
import { resolvePrimitive, unresolvedPrimitiveWarning } from './primitive-resolve.js';
import { parseTokenBlocks, compileTokenBlock } from './token-transform.js';
import { parseThemeBlocks, compileThemeBlock } from './theme-transform.js';
import { parseStyleBlocks, compileStyleBlock } from './style-transform.js';
import { normalizeCssLineEndings } from './normalize-css-eol.js';
import type { PrimitiveResolutionCache } from './primitive-resolution-cache.js';
import type { BoundaryDefinitionMap } from './boundary-manifest.js';

/** Convention source directory overrides per primitive kind. */
export interface PrimitiveDirs {
  readonly boundary?: string;
  readonly token?: string;
  readonly theme?: string;
  readonly style?: string;
}

/**
 * Explicit context for {@link transformCss}: everything the transform needs
 * that the Vite plugin lifecycle would otherwise hide in a closure or on
 * `this`.
 *
 * - `warn` — doctor-style warning sink (the Rollup `this.warn` in production).
 * - `addWatchFile` — optional convention-file watch registrar (the Rollup
 *   `this.addWatchFile`; absent in unit tests / outside watch mode, where
 *   watch registration is a legitimate no-op).
 * - `cache` — shared resolution caches (read + populated here).
 * - `projectRoot` / `dirs` — convention-resolution inputs.
 */
export interface TransformCssContext {
  warn(message: string): void;
  addWatchFile?(id: string): void;
  readonly cache: PrimitiveResolutionCache;
  readonly projectRoot: string;
  readonly dirs?: PrimitiveDirs;
  readonly boundaryDefinitions?: BoundaryDefinitionMap;
  /** Selector for the auto-emitted viewport `@container` containment (default `:root`). */
  readonly quantizeContainer?: string;
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

/**
 * Register a convention-file path as a watch dependency of the module being
 * transformed. Convention files (`tokens.ts` / `themes.ts` / `*.boundaries.ts`
 * / boundary dirs) are imported by the plugin's resolver, NOT by the CSS/.astro
 * module graph, so without this the dev server never re-runs the transform when
 * one is edited (stale output). Outside watch mode `addWatchFile` is a harmless
 * no-op. Undefined source = an unresolved primitive (nothing to watch).
 *
 * `addWatchFile` is guarded as optional: the real Rollup/Vite transform context
 * always provides it, but `transformCss` is also invoked directly in unit tests
 * with a bare context, where it is absent — watch registration is a dev-server
 * concern those tests don't exercise, so a missing method is a legitimate no-op
 * rather than a crash.
 */
function watchPrimitiveSource(ctx: TransformCssContext, source: string | undefined): void {
  if (source && typeof ctx.addWatchFile === 'function') {
    ctx.addWatchFile(source);
  }
}

// ---------------------------------------------------------------------------
// Transform
// ---------------------------------------------------------------------------

/**
 * Run the 4-phase CSS transform on a single sheet. Returns the rewritten CSS,
 * or `null` when nothing changed (no `@czap` at-rules, or every block was
 * left untransformed). Emits doctor-style warnings through `ctx.warn`, and
 * re-registers resolved convention files through `ctx.addWatchFile`.
 *
 * Behaviour is identical to the in-plugin transform it was lifted from: the
 * deterministic token→theme→style→quantize ordering, the per-kind resolution
 * caching, the parse-miss / empty-quantize / unresolved-primitive warnings,
 * and the sheet-level viewport-containment aggregation.
 */
export async function transformCss(code: string, id: string, ctx: TransformCssContext): Promise<string | null> {
  const { cache, projectRoot, dirs, quantizeContainer } = ctx;

  // Quick check -- skip files with no @czap at-rules
  const hasToken = code.includes('@token');
  const hasTheme = code.includes('@theme');
  const hasStyle = code.includes('@style');
  const hasQuantize = code.includes('@quantize');

  // Boundary-shadowing diagnostic (#114): must run BEFORE the early return so a
  // foreign app.css (no @czap at-rules) still gets checked against compiled
  // boundary output from other sheets in the same project.
  if (!hasQuantize && cache.lastCompiledBoundaryCss.size > 0) {
    const { diagnoseBoundaryShadowing } = await import('./boundary-shadowing.js');
    const boundaryCss = [...cache.lastCompiledBoundaryCss.values()].join('\n');
    for (const warning of diagnoseBoundaryShadowing(boundaryCss, normalizeCssLineEndings(code), id)) {
      ctx.warn(warning);
    }
  }

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
        ctx.warn(parseMissWarning('@token', id, line));
      }
    }

    for (const block of tokenBlocks) {
      const cacheKey = `${block.tokenName}:${id}`;
      let token: Token.Shape | null | undefined = cache.token.get(cacheKey);

      if (token === undefined) {
        const resolution = await resolvePrimitive('token', block.tokenName, id, projectRoot, dirs?.token);
        token = resolution?.primitive ?? null;
        cache.token.set(cacheKey, token);
        if (resolution) cache.source.set(cacheKey, resolution.source);
      }
      watchPrimitiveSource(ctx, cache.source.get(cacheKey));

      if (token === null) {
        ctx.warn(unresolvedPrimitiveWarning('token', block.tokenName, id, block.line, projectRoot, dirs?.token));
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
      let theme: Theme.Shape | null | undefined = cache.theme.get(cacheKey);

      if (theme === undefined) {
        const resolution = await resolvePrimitive('theme', block.themeName, id, projectRoot, dirs?.theme);
        theme = resolution?.primitive ?? null;
        cache.theme.set(cacheKey, theme);
        if (resolution) cache.source.set(cacheKey, resolution.source);
      }
      watchPrimitiveSource(ctx, cache.source.get(cacheKey));

      if (theme === null) {
        ctx.warn(unresolvedPrimitiveWarning('theme', block.themeName, id, block.line, projectRoot, dirs?.theme));
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
      let style: Style.Shape | null | undefined = cache.style.get(cacheKey);

      if (style === undefined) {
        const resolution = await resolvePrimitive('style', block.styleName, id, projectRoot, dirs?.style);
        style = resolution?.primitive ?? null;
        cache.style.set(cacheKey, style);
        if (resolution) cache.source.set(cacheKey, resolution.source);
      }
      watchPrimitiveSource(ctx, cache.source.get(cacheKey));

      if (style === null) {
        ctx.warn(unresolvedPrimitiveWarning('style', block.styleName, id, block.line, projectRoot, dirs?.style));
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
        ctx.warn(parseMissWarning('@quantize', id, line));
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
        ctx.warn(emptyQuantizeWarning(block.boundaryName, id, block.line));
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
      const discovered = ctx.boundaryDefinitions?.get(block.boundaryName);
      if (ctx.boundaryDefinitions && !discovered) {
        throw ValidationError(
          'vite-plugin',
          `boundary "${block.boundaryName}" referenced in @quantize not found (declare it with Boundary.make). ` +
            `Source: ${id}:${block.line}. ` +
            `Fix: export \`const ${block.boundaryName} = Boundary.make({ ... })\` from a boundary module in this project.`,
        );
      }
      let boundary: Boundary.Shape | null | undefined = cache.boundary.get(cacheKey);

      if (boundary === undefined) {
        const resolution =
          discovered ?? (await resolvePrimitive('boundary', block.boundaryName, id, projectRoot, dirs?.boundary));
        boundary = resolution?.primitive ?? null;
        cache.boundary.set(cacheKey, boundary);
        if (resolution) cache.source.set(cacheKey, resolution.source);
      }
      watchPrimitiveSource(ctx, cache.source.get(cacheKey));

      if (boundary === null) {
        ctx.warn(
          unresolvedPrimitiveWarning('boundary', block.boundaryName, id, block.line, projectRoot, dirs?.boundary),
        );
        continue;
      }

      const compiled = compileQuantizeBlock(block, boundary, { viewportContainerNames });
      // Keyed overwrite — re-transforming this block replaces its own entry
      // instead of appending forever across HMR edits.
      cache.lastCompiledBoundaryCss.set(cacheKey, compiled);
      const blockSpan = findAtRuleBlock(transformed, '@quantize', block.boundaryName);

      if (blockSpan) {
        transformed = transformed.substring(0, blockSpan.start) + compiled + transformed.substring(blockSpan.end);
      }
    }

    const containment = viewportContainmentRule(viewportContainerNames, quantizeContainer);
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

  return transformed;
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
export function findAtRuleBlock(css: string, marker: string, name: string): { start: number; end: number } | null {
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
