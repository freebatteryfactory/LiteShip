/**
 * `@style` CSS block parser and compiler.
 *
 * Parses custom `@style name { state { prop: value; } }` blocks from
 * CSS source and compiles them into scoped CSS with `@layer`,
 * `@scope`, and `@starting-style` rules using resolved `StyleDef`
 * definitions.
 *
 * @module
 */

import type { Style } from '@czap/core';
import { StyleCSSCompiler } from '@czap/compiler';
import { normalizeCssLineEndings } from './normalize-css-eol.js';
import {
  blankCssCommentsAndStrings,
  braceDepthDelta,
  lineOfOffset,
  parseFlatDeclarations,
  skipSegment,
  skipWsAndComments,
} from './css-scan.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Single parsed `@style` block: the style name being referenced, its
 * per-state CSS property overrides, and provenance.
 */
export interface StyleBlock {
  /** Named style (resolved against exported `StyleDef` values). */
  readonly styleName: string;
  /** `{ stateName: { cssProp: value } }` mapping. */
  readonly states: Record<string, Record<string, string>>;
  /** Absolute source file path. */
  readonly sourceFile: string;
  /** 1-based line where the block begins. */
  readonly line: number;
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

/**
 * Parse every `@style` block from CSS source text.
 *
 * Grammar:
 *
 * ```css
 * @style name {
 *   stateName {
 *     property: value;
 *   }
 * }
 * ```
 *
 * Parsing is fully character-level via the shared `css-scan` helpers
 * (same scanner as `@token` / `@theme` / `@quantize`): upstream
 * compilers (e.g. the Astro compiler re-serializing a `<style>` block)
 * emit at-rules mid-line and collapse whole sheets onto a single line,
 * so no line structure is assumed. At-rule markers are located on a
 * comment- and string-blanked copy of the source (same offsets) so
 * neither commented-out blocks nor marker text inside string values or
 * data URLs ever match; state bodies are parsed from the original
 * source with comment / string / functional-notation awareness,
 * including multi-line values.
 */
export function parseStyleBlocks(css: string, sourceFile: string): readonly StyleBlock[] {
  const normalized = normalizeCssLineEndings(css);
  const blanked = blankCssCommentsAndStrings(normalized);
  const blocks: StyleBlock[] = [];

  const atRule = /@style\s+([a-zA-Z_][a-zA-Z0-9_-]*)\s*\{/g;
  const statePattern = /([a-zA-Z_][a-zA-Z0-9_-]*)\s*\{/y;

  // Running depth from the last accepted scan position — markers are only
  // at-rules at the sheet's top level; `@style name {` text inside a
  // declaration value (e.g. a custom property holding a snippet) is value
  // text, and splicing it would corrupt the surrounding declaration.
  let depthFrom = 0;
  let depth = 0;

  let match: RegExpExecArray | null;
  while ((match = atRule.exec(blanked)) !== null) {
    depth = braceDepthDelta(blanked, depthFrom, match.index, depth);
    depthFrom = match.index;
    if (depth > 0) continue;
    const styleName = match[1]!;
    const blockStartLine = lineOfOffset(normalized, match.index);
    const states: Record<string, Record<string, string>> = {};

    let pos = match.index + match[0].length;

    while (pos < normalized.length) {
      pos = skipWsAndComments(normalized, pos);
      if (pos >= normalized.length) break;

      // Closing brace of the @style block
      if (normalized[pos] === '}') {
        pos++;
        break;
      }

      // State block opening: `stateName {` — bodies are flat declarations
      statePattern.lastIndex = pos;
      const stateMatch = statePattern.exec(normalized);
      if (stateMatch) {
        const stateName = stateMatch[1]!;
        const { props, end } = parseFlatDeclarations(normalized, statePattern.lastIndex);
        states[stateName] = props;
        pos = end;
        continue;
      }

      // Anything else (nested non-state wrappers, stray declarations):
      // skip one balanced segment and keep scanning for states.
      pos = skipSegment(normalized, pos);
    }

    blocks.push({ styleName, states, sourceFile, line: blockStartLine });

    // Resume marker search after this block so state bodies are never
    // re-matched as new at-rules. The block just consumed is balanced, so
    // the depth at `pos` is the depth where it began (top level).
    atRule.lastIndex = pos;
    depthFrom = pos;
    depth = 0;
  }

  return blocks;
}

// ---------------------------------------------------------------------------
// Compiler (delegates to @czap/compiler StyleCSSCompiler)
// ---------------------------------------------------------------------------

/**
 * Compile a parsed {@link StyleBlock} plus a resolved `StyleDef` into
 * scoped CSS with `@layer`, `@scope`, and `@starting-style` rules.
 * Delegates to the canonical `StyleCSSCompiler` to avoid duplicating
 * style-to-CSS logic.
 */
export function compileStyleBlock(block: StyleBlock, style: Style.Shape): string {
  const result = StyleCSSCompiler.compile(style, block.styleName);
  const parts = [result.layers, result.startingStyle].filter((part): part is string => part.length > 0);

  for (const [stateName, props] of Object.entries(block.states)) {
    if (Object.keys(props).length > 0) {
      const declarations = Object.entries(props)
        .map(([prop, value]) => `  ${prop}: ${value};`)
        .join('\n');
      parts.push(`/* state: ${stateName} */\n.${block.styleName}[data-state="${stateName}"] {\n${declarations}\n}`);
    }
  }

  return parts.join('\n\n');
}
